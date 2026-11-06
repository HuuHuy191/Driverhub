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
import { Vehicle } from '../src/modules/vehicles/entities/vehicle.entity';
import { Wallet } from '../src/modules/wallets/entities/wallet.entity';
import { WalletTransaction } from '../src/modules/wallets/entities/wallet-transaction.entity';
import { Customer } from '../src/modules/customers/entities/customer.entity';
import { Ride, RideStatus } from '../src/modules/rides/entities/ride.entity';
import { RideOffer } from '../src/modules/rides/entities/ride-offer.entity';
import { safeCleanup } from './helpers/fixtures';

// T11/T12/T13 (docs/FEATURES.md mục 15.1, BR-48 -> BR-53). Chạy trên CSDL
// thật, mỗi fixture tự tạo dữ liệu riêng và dọn ở afterEach.
jest.setTimeout(30000);

interface CancelFixture {
  adminUserId: string;
  driverUserId: string;
  driverProfileId: string;
  vehicleId: string;
  customerId: string;
  rideId: string;
  driverToken: string;
  adminToken: string;
}

describe('POST /rides/:id/cancel · /admin/rides/:id/cancel (T11, T12, T13)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: ConfigService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  function signToken(userId: string, role: 'ADMIN' | 'DRIVER'): string {
    return jwtService.sign(
      { sub: userId, role },
      {
        secret: configService.get<string>('jwt.accessSecret'),
        expiresIn: configService.get<string>('jwt.accessExpires') ?? '15m',
      },
    );
  }

  // Dựng một chuyến đã được gán tài xế (driverId/vehicleId/acceptedAt), sẵn
  // sàng để hủy hoặc nâng lên IN_PROGRESS tùy `status`.
  async function createFixture(status: RideStatus): Promise<CancelFixture> {
    const suffix = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;

    const userRepo = dataSource.getRepository(User);
    const driverProfileRepo = dataSource.getRepository(DriverProfile);
    const vehicleRepo = dataSource.getRepository(Vehicle);
    const walletRepo = dataSource.getRepository(Wallet);
    const customerRepo = dataSource.getRepository(Customer);
    const rideRepo = dataSource.getRepository(Ride);
    const rideOfferRepo = dataSource.getRepository(RideOffer);

    const adminUser = await userRepo.save({
      email: `cancel-admin-${suffix}@test.local`,
      passwordHash: 'not-used-in-this-test',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const driverUser = await userRepo.save({
      email: `cancel-driver-${suffix}@test.local`,
      passwordHash: 'not-used-in-this-test',
      role: 'DRIVER',
      status: 'ACTIVE',
    });

    const driverProfile = await driverProfileRepo.save({
      userId: driverUser.id,
      fullName: 'Cancel Tài xế',
      phoneNumber: `0920${suffix}`.slice(0, 15),
      approvalStatus: 'APPROVED',
      isOnline: false,
    });

    const vehicle = await vehicleRepo.save({
      driverId: driverProfile.id,
      vehicleType: 'MOTORBIKE',
      brand: 'Honda',
      modelName: 'Vision',
      licensePlate: `CAN-${suffix}`,
      isActive: true,
      verificationStatus: 'APPROVED',
    });

    await walletRepo.save({ userId: driverUser.id, balance: '0' });

    const customer = await customerRepo.save({
      fullName: 'Cancel Khách hàng',
      phoneNumber: `0921${suffix}`.slice(0, 15),
    });

    const ride = await rideRepo.save({
      rideCode: `CAN-${suffix}`.slice(0, 20),
      customerId: customer.id,
      driverId: driverProfile.id,
      vehicleId: vehicle.id,
      pickupAddress: 'Điểm đón kiểm thử hủy chuyến',
      pickupLatitude: '21.0067000',
      pickupLongitude: '105.8431000',
      dropoffAddress: 'Điểm trả kiểm thử hủy chuyến',
      dropoffLatitude: '21.0367000',
      dropoffLongitude: '105.7826000',
      vehicleType: 'MOTORBIKE',
      distanceKm: '5.00',
      estimatedFare: '30000',
      paymentMethod: 'CASH',
      status,
      acceptedAt: new Date(),
      createdBy: adminUser.id,
    });

    // Offer ACCEPTED lịch sử — mô phỏng đúng kết quả của POST /rides/:id/accept
    // (BR-44 chặn tạo trùng, dùng để kiểm tra T13 không bị offer lại).
    await rideOfferRepo.save({
      rideId: ride.id,
      driverId: driverProfile.id,
      status: 'ACCEPTED',
      round: 1,
      expiredAt: new Date(Date.now() + 60_000),
    });

    return {
      adminUserId: adminUser.id,
      driverUserId: driverUser.id,
      driverProfileId: driverProfile.id,
      vehicleId: vehicle.id,
      customerId: customer.id,
      rideId: ride.id,
      driverToken: signToken(driverUser.id, 'DRIVER'),
      adminToken: signToken(adminUser.id, 'ADMIN'),
    };
  }

  async function cleanupFixture(fixture: CancelFixture): Promise<void> {
    if (!fixture) return;

    await safeCleanup([
      () =>
        dataSource
          .getRepository(WalletTransaction)
          .delete({ rideId: fixture.rideId }),
      () => dataSource.getRepository(Ride).delete(fixture.rideId),
      () => dataSource.getRepository(Vehicle).delete(fixture.vehicleId),
      () =>
        dataSource.getRepository(DriverProfile).delete(fixture.driverProfileId),
      () =>
        dataSource
          .getRepository(Wallet)
          .delete({ userId: fixture.driverUserId }),
      () => dataSource.getRepository(Customer).delete(fixture.customerId),
      () => dataSource.getRepository(User).delete(fixture.driverUserId),
      () => dataSource.getRepository(User).delete(fixture.adminUserId),
    ]);
  }

  describe('T11 — hủy ở ACCEPTED (BR-52)', () => {
    let fixture: CancelFixture;

    beforeEach(async () => {
      fixture = await createFixture('ACCEPTED');
    });

    afterEach(async () => {
      await cleanupFixture(fixture);
    });

    it('admin hủy thành công, không phát sinh WalletTransaction nào', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/rides/${fixture.rideId}/cancel`)
        .set('Authorization', `Bearer ${fixture.adminToken}`)
        .send({ reason: 'Khách hàng báo hủy qua tổng đài' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('CANCELLED');
      expect(response.body.data.cancelledBy).toBe('ADMIN');

      const rideRow = await dataSource
        .getRepository(Ride)
        .findOne({ where: { id: fixture.rideId } });
      expect(rideRow?.status).toBe('CANCELLED');
      expect(rideRow?.cancelReason).toBe('Khách hàng báo hủy qua tổng đài');

      const transactions = await dataSource
        .getRepository(WalletTransaction)
        .find({ where: { rideId: fixture.rideId } });
      expect(transactions).toHaveLength(0);
    });
  });

  describe('T12 — hủy ở IN_PROGRESS (BR-49)', () => {
    let fixture: CancelFixture;

    beforeEach(async () => {
      fixture = await createFixture('IN_PROGRESS');
    });

    afterEach(async () => {
      await cleanupFixture(fixture);
    });

    it('admin nhận 409 CANNOT_CANCEL_IN_PROGRESS', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/rides/${fixture.rideId}/cancel`)
        .set('Authorization', `Bearer ${fixture.adminToken}`)
        .send({ reason: 'Thử hủy khi đang chở khách' });

      expect(response.status).toBe(409);
      expect(response.body.errorCode).toBe('CANNOT_CANCEL_IN_PROGRESS');
    });

    it('tài xế nhận 409 CANNOT_CANCEL_IN_PROGRESS', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/rides/${fixture.rideId}/cancel`)
        .set('Authorization', `Bearer ${fixture.driverToken}`)
        .send({ reason: 'Thử hủy khi đang chở khách' });

      expect(response.status).toBe(409);
      expect(response.body.errorCode).toBe('CANNOT_CANCEL_IN_PROGRESS');
    });
  });

  describe('T13 — tài xế hủy chuyến đã nhận (BR-51, BR-44)', () => {
    let fixture: CancelFixture;

    beforeEach(async () => {
      fixture = await createFixture('ACCEPTED');
    });

    afterEach(async () => {
      await cleanupFixture(fixture);
    });

    it('ride về SEARCHING, gỡ driverId/vehicleId/acceptedAt, tăng cancelCount, offer cũ vẫn ACCEPTED', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/rides/${fixture.rideId}/cancel`)
        .set('Authorization', `Bearer ${fixture.driverToken}`)
        .send({ reason: 'Xe bị thủng lốp, không thể tiếp tục' });

      expect(response.status).toBe(200);
      expect(response.body.data.rideStatus).toBe('SEARCHING');
      expect(response.body.data.redispatched).toBe(true);

      const rideRow = await dataSource
        .getRepository(Ride)
        .findOne({ where: { id: fixture.rideId } });
      expect(rideRow?.status).toBe('SEARCHING');
      expect(rideRow?.driverId).toBeNull();
      expect(rideRow?.vehicleId).toBeNull();
      expect(rideRow?.acceptedAt).toBeNull();
      expect(rideRow?.cancelledBy).toBe('DRIVER');

      const driverRow = await dataSource
        .getRepository(DriverProfile)
        .findOne({ where: { id: fixture.driverProfileId } });
      expect(driverRow?.cancelCount).toBe(1);

      // BR-44: offer cũ (ACCEPTED) của tài xế này vẫn còn — UNIQUE(rideId,
      // driverId) chặn DispatchService tạo offer mới cho chính anh ta.
      const offers = await dataSource
        .getRepository(RideOffer)
        .find({ where: { rideId: fixture.rideId, driverId: fixture.driverProfileId } });
      expect(offers).toHaveLength(1);
      expect(offers[0].status).toBe('ACCEPTED');
    });
  });
});
