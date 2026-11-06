import { randomBytes } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { User } from '../src/modules/users/entities/user.entity';
import { DriverProfile } from '../src/modules/drivers/entities/driver-profile.entity';
import { DriverDocument } from '../src/modules/drivers/entities/driver-document.entity';
import { Customer } from '../src/modules/customers/entities/customer.entity';
import { Ride } from '../src/modules/rides/entities/ride.entity';
import { RideStatusHistory } from '../src/modules/rides/entities/ride-status-history.entity';
import { safeCleanup } from './helpers/fixtures';

jest.setTimeout(30000);

describe('Driver mobile profile and ride read APIs', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: ConfigService;
  let driverUserId: string;
  let secondDriverUserId: string;
  let thirdDriverUserId: string;
  let driverProfileId: string;
  let secondDriverProfileId: string;
  let thirdDriverProfileId: string;
  let adminUserId: string;
  let customerId: string;
  let rideId: string;
  let rideCode: string;
  let documentIds: string[] = [];
  let driverToken: string;
  let secondDriverToken: string;
  let thirdDriverToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

    dataSource = app.get(DataSource);
    jwtService = app.get(JwtService);
    configService = app.get(ConfigService);
    await createFixture();
  });

  afterAll(async () => {
    await safeCleanup([
      () => dataSource.getRepository(RideStatusHistory).delete({ rideId }),
      () => dataSource.getRepository(Ride).delete(rideId),
      () => dataSource.getRepository(DriverDocument).delete(documentIds),
      () => dataSource.getRepository(DriverProfile).delete(driverProfileId),
      () =>
        dataSource.getRepository(DriverProfile).delete(secondDriverProfileId),
      () =>
        dataSource.getRepository(DriverProfile).delete(thirdDriverProfileId),
      () => dataSource.getRepository(Customer).delete(customerId),
      () => dataSource.getRepository(User).delete(driverUserId),
      () => dataSource.getRepository(User).delete(secondDriverUserId),
      () => dataSource.getRepository(User).delete(thirdDriverUserId),
      () => dataSource.getRepository(User).delete(adminUserId),
    ]);
    await app.close();
  });

  function signToken(
    userId: string,
    role: 'ADMIN' | 'DRIVER' = 'DRIVER',
  ): string {
    return jwtService.sign(
      { sub: userId, role },
      {
        secret: configService.get<string>('jwt.accessSecret'),
        expiresIn: configService.get<string>('jwt.accessExpires') ?? '15m',
      },
    );
  }

  async function createFixture(): Promise<void> {
    const suffix = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
    const userRepo = dataSource.getRepository(User);
    const driverRepo = dataSource.getRepository(DriverProfile);

    const admin = await userRepo.save({
      email: `mobile-read-admin-${suffix}@test.local`,
      passwordHash: 'not-used-in-this-test',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminUserId = admin.id;

    const driverUser = await userRepo.save({
      email: `mobile-read-driver-${suffix}@test.local`,
      passwordHash: 'not-used-in-this-test',
      role: 'DRIVER',
      status: 'PENDING',
    });
    driverUserId = driverUser.id;
    const secondDriverUser = await userRepo.save({
      email: `mobile-read-other-${suffix}@test.local`,
      passwordHash: 'not-used-in-this-test',
      role: 'DRIVER',
      status: 'ACTIVE',
    });
    secondDriverUserId = secondDriverUser.id;
    const thirdDriverUser = await userRepo.save({
      email: `mobile-read-third-${suffix}@test.local`,
      passwordHash: 'not-used-in-this-test',
      role: 'DRIVER',
      status: 'ACTIVE',
    });
    thirdDriverUserId = thirdDriverUser.id;

    const driver = await driverRepo.save({
      userId: driverUserId,
      fullName: 'Tài xế kiểm thử đọc',
      phoneNumber: `0931${suffix}`.slice(0, 15),
      approvalStatus: 'REJECTED',
      rejectReason: 'Ảnh giấy tờ cần tải lại',
    });
    driverProfileId = driver.id;
    const secondDriver = await driverRepo.save({
      userId: secondDriverUserId,
      fullName: 'Tài xế khác',
      phoneNumber: `0932${suffix}`.slice(0, 15),
      approvalStatus: 'APPROVED',
    });
    secondDriverProfileId = secondDriver.id;
    const thirdDriver = await driverRepo.save({
      userId: thirdDriverUserId,
      fullName: 'Tài xế thứ ba',
      phoneNumber: `0934${suffix}`.slice(0, 15),
      approvalStatus: 'APPROVED',
    });
    thirdDriverProfileId = thirdDriver.id;

    const firstDocument = await dataSource.getRepository(DriverDocument).save({
      driverId: driverProfileId,
      docType: 'ID_CARD_FRONT',
      fileUrl: 'https://example.test/id-front.jpg',
      verificationStatus: 'REJECTED',
      rejectReason: 'Ảnh bị mờ',
    });
    documentIds = [firstDocument.id];

    const customer = await dataSource.getRepository(Customer).save({
      fullName: 'Khách kiểm thử chuyến',
      phoneNumber: `0933${suffix}`.slice(0, 15),
    });
    customerId = customer.id;
    const ride = await dataSource.getRepository(Ride).save({
      rideCode: `MOB-${suffix}`.slice(0, 20),
      customerId,
      driverId: secondDriverProfileId,
      pickupAddress: 'Điểm đón kiểm thử',
      pickupLatitude: '21.0067000',
      pickupLongitude: '105.8431000',
      dropoffAddress: 'Điểm trả kiểm thử',
      dropoffLatitude: '21.0367000',
      dropoffLongitude: '105.7826000',
      vehicleType: 'MOTORBIKE',
      distanceKm: '5.00',
      estimatedFare: '30000',
      finalFare: '30000',
      commissionRate: '0.1000',
      platformFee: '3000',
      driverEarning: '27000',
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      completedAt: new Date(),
      createdBy: adminUserId,
    });
    rideId = ride.id;
    rideCode = ride.rideCode;
    await dataSource.getRepository(RideStatusHistory).save({
      rideId,
      fromStatus: 'IN_PROGRESS',
      toStatus: 'COMPLETED',
      changedByType: 'DRIVER',
      changedById: secondDriverUserId,
    });

    driverToken = signToken(driverUserId);
    secondDriverToken = signToken(secondDriverUserId);
    thirdDriverToken = signToken(thirdDriverUserId);
    adminToken = signToken(adminUserId, 'ADMIN');
  }

  it('lists legacy documents and requires identity details to resubmit a rejected profile', async () => {
    const documentsResponse = await request(app.getHttpServer())
      .get('/api/v1/drivers/me/documents')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);
    expect(documentsResponse.body.data).toHaveLength(1);
    expect(documentsResponse.body.data[0]).toMatchObject({
      docType: 'ID_CARD_FRONT',
      verificationStatus: 'REJECTED',
      rejectReason: 'Ảnh bị mờ',
    });

    await request(app.getHttpServer())
      .post('/api/v1/drivers/me/resubmit')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(400)
      .expect(({ body }) => {
        expect(body.errorCode).toBe('IDENTITY_INFORMATION_INCOMPLETE');
      });

    await dataSource.getRepository(DriverProfile).update(driverProfileId, {
      citizenIdNumber: '012345678901',
      citizenIdIssueDate: '2021-06-15',
      driverLicenseNumber: '790123456789',
      driverLicenseIssueDate: '2022-01-20',
    });

    await request(app.getHttpServer())
      .post('/api/v1/drivers/me/resubmit')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.approvalStatus).toBe('PENDING');
      });

    const profile = await dataSource
      .getRepository(DriverProfile)
      .findOneByOrFail({ id: driverProfileId });
    expect(profile.approvalStatus).toBe('PENDING');
    expect(profile.rejectReason).toBeNull();
  });

  it('returns a driver’s ride list, active ride and status history without exposing another driver’s ride', async () => {
    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/rides/me?status=COMPLETED&page=1&limit=10')
      .set('Authorization', `Bearer ${secondDriverToken}`)
      .expect(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0]).toMatchObject({
      id: rideId,
      rideCode: expect.any(String),
      finalFare: 30000,
      driverEarning: 27000,
    });
    expect(listResponse.body.meta.total).toBe(1);

    const activeResponse = await request(app.getHttpServer())
      .get('/api/v1/rides/me/active')
      .set('Authorization', `Bearer ${secondDriverToken}`)
      .expect(200);
    expect(activeResponse.body.data).toBeNull();

    const historyResponse = await request(app.getHttpServer())
      .get(`/api/v1/rides/${rideId}/history`)
      .set('Authorization', `Bearer ${secondDriverToken}`)
      .expect(200);
    expect(historyResponse.body.data).toHaveLength(1);
    expect(historyResponse.body.data[0].toStatus).toBe('COMPLETED');

    await request(app.getHttpServer())
      .get(`/api/v1/rides/${rideId}`)
      .set('Authorization', `Bearer ${thirdDriverToken}`)
      .expect(403)
      .expect(({ body }) => {
        expect(body.errorCode).toBe('NOT_RIDE_OWNER');
      });
  });

  it('lets Admin filter rides and view ride details with status history', async () => {
    const listResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/admin/rides?status=COMPLETED&search=${encodeURIComponent(rideCode)}&page=1&limit=10`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0]).toMatchObject({
      id: rideId,
      customer: { fullName: 'Khách kiểm thử chuyến' },
      driver: { fullName: 'Tài xế khác' },
    });

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/admin/rides/${rideId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detailResponse.body.data.history).toHaveLength(1);
    expect(detailResponse.body.data.history[0].toStatus).toBe('COMPLETED');
    expect(detailResponse.body.data.offers).toEqual([]);

    await request(app.getHttpServer())
      .get('/api/v1/admin/rides')
      .auth(driverToken, { type: 'bearer' })
      .expect(403);
  });
});
