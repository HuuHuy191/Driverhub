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
import { Customer } from '../src/modules/customers/entities/customer.entity';
import { Ride } from '../src/modules/rides/entities/ride.entity';
import { RideOffer } from '../src/modules/rides/entities/ride-offer.entity';
import { safeCleanup } from './helpers/fixtures';

// T01 (docs/FEATURES.md mục 15.1, BR-45) — hai tài xế bấm nhận CÙNG MỘT
// chuyến đồng thời. Chạy trên CSDL thật (test:e2e, giống app.e2e-spec.ts),
// tự dựng dữ liệu và dọn sạch sau khi xong để không ảnh hưởng CSDL dev.
jest.setTimeout(30000);

describe('POST /rides/:id/accept — tranh chấp đồng thời (T01, BR-45)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: ConfigService;

  // Id của mọi bản ghi được test này tạo ra, để dọn dẹp đúng thứ tự ở afterAll.
  let adminUserId: string;
  let driverAUserId: string;
  let driverBUserId: string;
  let driverAProfileId: string;
  let driverBProfileId: string;
  let vehicleAId: string;
  let vehicleBId: string;
  let customerId: string;
  let rideId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Khớp cấu hình thật ở main.ts để URL và định dạng lỗi giống production.
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

    await seedFixture();
  });

  afterAll(async () => {
    await cleanupFixture();
    await app.close();
  });

  async function seedFixture(): Promise<void> {
    const suffix = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;

    const userRepo = dataSource.getRepository(User);
    const driverProfileRepo = dataSource.getRepository(DriverProfile);
    const vehicleRepo = dataSource.getRepository(Vehicle);
    const walletRepo = dataSource.getRepository(Wallet);
    const customerRepo = dataSource.getRepository(Customer);
    const rideRepo = dataSource.getRepository(Ride);
    const rideOfferRepo = dataSource.getRepository(RideOffer);

    // Admin chỉ để làm chủ sở hữu FK_R_Creator của Ride — không đăng nhập thật.
    const adminUser = await userRepo.save({
      email: `t01-admin-${suffix}@test.local`,
      passwordHash: 'not-used-in-this-test',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminUserId = adminUser.id;

    const [driverAUser, driverBUser] = await Promise.all([
      userRepo.save({
        email: `t01-driver-a-${suffix}@test.local`,
        passwordHash: 'not-used-in-this-test',
        role: 'DRIVER',
        status: 'ACTIVE',
      }),
      userRepo.save({
        email: `t01-driver-b-${suffix}@test.local`,
        passwordHash: 'not-used-in-this-test',
        role: 'DRIVER',
        status: 'ACTIVE',
      }),
    ]);
    driverAUserId = driverAUser.id;
    driverBUserId = driverBUser.id;

    const [driverAProfile, driverBProfile] = await Promise.all([
      driverProfileRepo.save({
        userId: driverAUserId,
        fullName: 'T01 Tài xế A',
        phoneNumber: `0900${suffix}`.slice(0, 15),
        approvalStatus: 'APPROVED',
        isOnline: true,
        currentLatitude: '21.0285000',
        currentLongitude: '105.8542000',
        lastLocationUpdatedAt: new Date(),
      }),
      driverProfileRepo.save({
        userId: driverBUserId,
        fullName: 'T01 Tài xế B',
        phoneNumber: `0901${suffix}`.slice(0, 15),
        approvalStatus: 'APPROVED',
        isOnline: true,
        currentLatitude: '21.0290000',
        currentLongitude: '105.8500000',
        lastLocationUpdatedAt: new Date(),
      }),
    ]);
    driverAProfileId = driverAProfile.id;
    driverBProfileId = driverBProfile.id;

    const [vehicleA, vehicleB] = await Promise.all([
      vehicleRepo.save({
        driverId: driverAProfileId,
        vehicleType: 'MOTORBIKE',
        brand: 'Honda',
        modelName: 'Vision',
        licensePlate: `T01A-${suffix}`,
        isActive: true,
        verificationStatus: 'APPROVED',
      }),
      vehicleRepo.save({
        driverId: driverBProfileId,
        vehicleType: 'MOTORBIKE',
        brand: 'Honda',
        modelName: 'Wave',
        licensePlate: `T01B-${suffix}`,
        isActive: true,
        verificationStatus: 'APPROVED',
      }),
    ]);
    vehicleAId = vehicleA.id;
    vehicleBId = vehicleB.id;

    await Promise.all([
      walletRepo.save({ userId: driverAUserId, balance: '0' }),
      walletRepo.save({ userId: driverBUserId, balance: '0' }),
    ]);

    const customer = await customerRepo.save({
      fullName: 'T01 Khách hàng',
      phoneNumber: `0902${suffix}`.slice(0, 15),
    });
    customerId = customer.id;

    const ride = await rideRepo.save({
      rideCode: `T01-${suffix}`.slice(0, 20),
      customerId,
      pickupAddress: 'Điểm đón kiểm thử T01',
      pickupLatitude: '21.0067000',
      pickupLongitude: '105.8431000',
      dropoffAddress: 'Điểm trả kiểm thử T01',
      dropoffLatitude: '21.0367000',
      dropoffLongitude: '105.7826000',
      vehicleType: 'MOTORBIKE',
      distanceKm: '7.50',
      estimatedFare: '34000',
      paymentMethod: 'CASH',
      status: 'SEARCHING',
      createdBy: adminUserId,
    });
    rideId = ride.id;

    // Bỏ qua DispatchService thật (chặng 13) — tự tạo 2 RideOffer SENT, y hệt
    // những gì endpoint TEMP POST /admin/rides/:rideId/offer/:driverId làm.
    const expiredAt = new Date(Date.now() + 60_000);
    await Promise.all([
      rideOfferRepo.save({
        rideId,
        driverId: driverAProfileId,
        status: 'SENT',
        round: 1,
        expiredAt,
      }),
      rideOfferRepo.save({
        rideId,
        driverId: driverBProfileId,
        status: 'SENT',
        round: 1,
        expiredAt,
      }),
    ]);
  }

  async function cleanupFixture(): Promise<void> {
    // Ride xóa trước (CASCADE dọn theo RideOffer/RideStatusHistory), rồi tới
    // các bảng bị Ride tham chiếu (NO ACTION), theo đúng thứ tự phụ thuộc FK.
    // Mỗi biến có thể vẫn undefined nếu beforeAll/seedFixture throw giữa
    // chừng — safeCleanup bỏ qua lỗi từng bước, không để afterAll sập theo.
    await safeCleanup([
      async () => {
        if (rideId) await dataSource.getRepository(Ride).delete(rideId);
      },
      async () => {
        if (vehicleAId)
          await dataSource.getRepository(Vehicle).delete(vehicleAId);
      },
      async () => {
        if (vehicleBId)
          await dataSource.getRepository(Vehicle).delete(vehicleBId);
      },
      async () => {
        if (driverAProfileId)
          await dataSource
            .getRepository(DriverProfile)
            .delete(driverAProfileId);
      },
      async () => {
        if (driverBProfileId)
          await dataSource
            .getRepository(DriverProfile)
            .delete(driverBProfileId);
      },
      async () => {
        if (driverAUserId)
          await dataSource
            .getRepository(Wallet)
            .delete({ userId: driverAUserId });
      },
      async () => {
        if (driverBUserId)
          await dataSource
            .getRepository(Wallet)
            .delete({ userId: driverBUserId });
      },
      async () => {
        if (customerId)
          await dataSource.getRepository(Customer).delete(customerId);
      },
      async () => {
        if (driverAUserId)
          await dataSource.getRepository(User).delete(driverAUserId);
      },
      async () => {
        if (driverBUserId)
          await dataSource.getRepository(User).delete(driverBUserId);
      },
      async () => {
        if (adminUserId)
          await dataSource.getRepository(User).delete(adminUserId);
      },
    ]);
  }

  function signAccessToken(userId: string): string {
    return jwtService.sign(
      { sub: userId, role: 'DRIVER' },
      {
        secret: configService.get<string>('jwt.accessSecret'),
        expiresIn: configService.get<string>('jwt.accessExpires') ?? '15m',
      },
    );
  }

  it('đúng một tài xế nhận được 200, người kia 409 RIDE_ALREADY_TAKEN; chuyến chỉ có một driverId', async () => {
    const tokenA = signAccessToken(driverAUserId);
    const tokenB = signAccessToken(driverBUserId);

    const [responseA, responseB] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/rides/${rideId}/accept`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send(),
      request(app.getHttpServer())
        .post(`/api/v1/rides/${rideId}/accept`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send(),
    ]);

    const statuses = [responseA.status, responseB.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409]);

    const winner = responseA.status === 200 ? responseA : responseB;
    const loser = responseA.status === 200 ? responseB : responseA;
    expect(loser.body.errorCode).toBe('RIDE_ALREADY_TAKEN');

    // BR-45: chuyến chỉ có ĐÚNG MỘT driverId, trùng với người thắng ở tầng HTTP.
    const rideRow = await dataSource
      .getRepository(Ride)
      .findOne({ where: { id: rideId } });
    expect(rideRow?.status).toBe('ACCEPTED');
    expect([driverAProfileId, driverBProfileId]).toContain(rideRow?.driverId);

    const winnerProfileId =
      winner === responseA ? driverAProfileId : driverBProfileId;
    expect(rideRow?.driverId).toBe(winnerProfileId);

    // Offer của người thắng -> ACCEPTED, offer của người thua -> LOST (BR-45).
    const offers = await dataSource
      .getRepository(RideOffer)
      .find({ where: { rideId } });
    expect(offers).toHaveLength(2);
    const winnerOffer = offers.find((o) => o.driverId === winnerProfileId);
    const loserOffer = offers.find((o) => o.driverId !== winnerProfileId);
    expect(winnerOffer?.status).toBe('ACCEPTED');
    expect(loserOffer?.status).toBe('LOST');
  });
});
