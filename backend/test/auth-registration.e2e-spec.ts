import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { User } from '../src/modules/users/entities/user.entity';
import { DriverProfile } from '../src/modules/drivers/entities/driver-profile.entity';
import { DriverDocument } from '../src/modules/drivers/entities/driver-document.entity';
import { Vehicle } from '../src/modules/vehicles/entities/vehicle.entity';
import { Wallet } from '../src/modules/wallets/entities/wallet.entity';
import { RefreshToken } from '../src/modules/auth/entities/refresh-token.entity';

jest.setTimeout(30000);

// BR-03/04/05/06/07/16/22: real JSON API and SQL Server.
describe('Driver registration -> database -> admin', () => {
  let app: INestApplication;
  let db: DataSource;
  let adminId: string;
  let adminToken: string;
  let userId: string;
  let driverId: string;
  const suffix = randomUUID().replace(/-/g, '');
  const fields = {
    email: `registration-${suffix}@example.com`,
    password: `Test${suffix}1`,
    fullName: 'TEST Registration',
    phoneNumber: `09${Date.now().toString().slice(-8)}`,
    dateOfBirth: '1995-04-12',
    citizenIdNumber: '012345678901',
    citizenIdIssueDate: '2021-06-15',
    driverLicenseNumber: `GPLX${suffix.slice(0, 10)}`,
    driverLicenseIssueDate: '2022-01-20',
    vehicleType: 'MOTORBIKE',
    vehicleBrand: 'Honda',
    vehicleModelName: 'TEST',
    vehicleLicensePlate: `TEST-${suffix.slice(0, 8)}`,
  };
  beforeAll(async () => {
    if (!process.env.DB_DATABASE?.endsWith('_Test')) {
      throw new Error('Registration tests require a separate *_Test database.');
    }
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    db = app.get(DataSource);
    const admin = await db.getRepository(User).save({
      email: `admin-registration-${suffix}@example.com`,
      passwordHash: await bcrypt.hash('TestAdmin123', 10),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminId = admin.id;
    adminToken = app.get(JwtService).sign(
      { sub: adminId, role: 'ADMIN' },
      {
        secret: app.get(ConfigService).get<string>('jwt.accessSecret'),
      },
    );
  });

  afterAll(async () => {
    try {
      if (db?.isInitialized && userId) {
        await db.getRepository(RefreshToken).delete({ userId });
        await db.getRepository(DriverDocument).delete({ driverId });
        await db.getRepository(Vehicle).delete({ driverId });
        await db.getRepository(DriverProfile).delete(driverId);
        await db.getRepository(User).delete(userId);
      }
      if (db?.isInitialized && adminId)
        await db.getRepository(User).delete(adminId);
    } finally {
      await app?.close();
    }
  });

  function registration(overrides: Partial<typeof fields> = {}) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...fields, ...overrides });
  }

  it('accepts email without OTP; saves pending user, identity details and vehicle without documents', async () => {
    const result = await registration().expect(201);
    userId = result.body.data.userId;
    driverId = result.body.data.driverId;
    expect(result.body.data.approvalStatus).toBe('PENDING');
    const user = await db.getRepository(User).findOneByOrFail({ id: userId });
    expect(user.status).toBe('PENDING');
    expect(await bcrypt.compare(fields.password, user.passwordHash)).toBe(true);
    expect(user.passwordHash.startsWith('$2b$10$')).toBe(true);
    const driver = await db
      .getRepository(DriverProfile)
      .findOneByOrFail({ id: driverId });
    expect(driver.approvalStatus).toBe('PENDING');
    expect(driver.citizenIdNumber).toBe(fields.citizenIdNumber);
    expect(driver.citizenIdIssueDate).toBe(fields.citizenIdIssueDate);
    expect(driver.driverLicenseNumber).toBe(fields.driverLicenseNumber);
    expect(driver.driverLicenseIssueDate).toBe(fields.driverLicenseIssueDate);
    expect(await db.getRepository(DriverDocument).countBy({ driverId })).toBe(
      0,
    );
    expect(await db.getRepository(Vehicle).countBy({ driverId })).toBe(1);
    expect(await db.getRepository(Wallet).countBy({ userId })).toBe(0);
  });

  it('makes the pending profile identity details visible to admin', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/drivers')
      .query({ search: fields.email, approvalStatus: 'PENDING' })
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(list.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: driverId,
          email: fields.email,
          documentsCount: 0,
        }),
      ]),
    );
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/drivers/${driverId}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(detail.body.data.documents).toHaveLength(0);
    expect(detail.body.data).toMatchObject({
      citizenIdNumber: fields.citizenIdNumber,
      citizenIdIssueDate: fields.citizenIdIssueDate,
      driverLicenseNumber: fields.driverLicenseNumber,
      driverLicenseIssueDate: fields.driverLicenseIssueDate,
    });
  });

  it('allows pending login while protecting driver business APIs (BR-07)', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: fields.email, password: fields.password })
      .expect(200);
    expect(login.body.data.driver.approvalStatus).toBe('PENDING');
    const result = await request(app.getHttpServer())
      .get('/api/v1/wallet')
      .auth(login.body.data.accessToken, { type: 'bearer' })
      .expect(403);
    expect(result.body.errorCode).toBe('ACCOUNT_NOT_APPROVED');
  });

  it.each([
    [{}, 'EMAIL_ALREADY_EXISTS'],
    [{ email: `different-${suffix}@example.com` }, 'PHONE_ALREADY_EXISTS'],
    [
      {
        email: `different-${suffix}@example.com`,
        phoneNumber: `08${fields.phoneNumber.slice(2)}`,
      },
      'LICENSE_PLATE_EXISTS',
    ],
  ])(
    'rejects duplicate registration fields: %s -> %s',
    async (overrides, code) => {
      const result = await registration(overrides).expect(409);
      expect(result.body.errorCode).toBe(code);
    },
  );

  it('rejects missing identity details without creating a user (BR-16)', async () => {
    const email = `missing-${suffix}@example.com`;
    const result = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...fields, email, citizenIdNumber: undefined })
      .expect(400);
    expect(result.body.errorCode).toBe('BAD_REQUEST');
    expect(await db.getRepository(User).countBy({ email })).toBe(0);
  });
});
