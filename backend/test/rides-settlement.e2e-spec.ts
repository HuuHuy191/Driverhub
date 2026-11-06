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
import { Ride } from '../src/modules/rides/entities/ride.entity';
import { safeCleanup } from './helpers/fixtures';

// T02 và T09 (docs/FEATURES.md mục 15.1, BR-59/61/62/64) — quyết toán khi
// PATCH /rides/:id/status {status:'COMPLETED'}. Chạy trên CSDL thật, mỗi
// test tự dựng dữ liệu RIÊNG và dọn sạch (kể cả khôi phục số dư ví nền tảng
// vốn là dữ liệu CHIA SẺ có sẵn trong CSDL, không phải do test tạo ra) ở
// afterEach để có thể chạy lặp lại nhiều lần mà không cần dọn tay.
jest.setTimeout(30000);

interface SettlementFixture {
  suffix: string;
  adminUserId: string;
  driverUserId: string;
  driverProfileId: string;
  vehicleId: string;
  customerId: string;
  rideId: string;
  rideCode: string;
  driverToken: string;
  platformWalletId: string;
  platformBalanceBefore: number;
}

describe('PATCH /rides/:id/status — quyết toán khi COMPLETED (T02, T09)', () => {
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

  // BR-54: ví nền tảng = ví của tài khoản ADMIN cũ nhất — y hệt truy vấn
  // RideStatusService.findPlatformWallet(). Đây là dữ liệu CÓ SẴN trong
  // CSDL (tạo lúc seed), không phải do fixture của test này tạo ra.
  async function findPlatformWallet(): Promise<{
    id: string;
    balance: number;
  }> {
    const wallet = await dataSource
      .getRepository(Wallet)
      .createQueryBuilder('wallet')
      .innerJoin('wallet.user', 'user')
      .where('user.role = :role', { role: 'ADMIN' })
      .orderBy('wallet.createdAt', 'ASC')
      .getOne();
    if (!wallet) {
      throw new Error('Không tìm thấy ví nền tảng trong CSDL kiểm thử.');
    }
    return { id: wallet.id, balance: Number(wallet.balance) };
  }

  async function getCommissionRate(): Promise<number> {
    const rows: { value: string }[] = await dataSource.query(
      "SELECT [value] FROM SystemConfig WHERE [key] = 'COMMISSION_RATE'",
    );
    return Number(rows[0].value);
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

  // Dựng một chuyến ở thẳng trạng thái IN_PROGRESS (bỏ qua vòng đời
  // SEARCHING->ACCEPTED->ARRIVED, không thuộc phạm vi hai tình huống này),
  // sẵn sàng để PATCH .../status {status:'COMPLETED'} quyết toán.
  async function createFixture(
    finalFareOverride: string,
    paymentMethod: 'CASH' | 'WALLET' = 'CASH',
  ): Promise<SettlementFixture> {
    const suffix = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;

    const userRepo = dataSource.getRepository(User);
    const driverProfileRepo = dataSource.getRepository(DriverProfile);
    const vehicleRepo = dataSource.getRepository(Vehicle);
    const walletRepo = dataSource.getRepository(Wallet);
    const customerRepo = dataSource.getRepository(Customer);
    const rideRepo = dataSource.getRepository(Ride);

    const adminUser = await userRepo.save({
      email: `settle-admin-${suffix}@test.local`,
      passwordHash: 'not-used-in-this-test',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const driverUser = await userRepo.save({
      email: `settle-driver-${suffix}@test.local`,
      passwordHash: 'not-used-in-this-test',
      role: 'DRIVER',
      status: 'ACTIVE',
    });

    const driverProfile = await driverProfileRepo.save({
      userId: driverUser.id,
      fullName: 'Settlement Tài xế',
      phoneNumber: `0910${suffix}`.slice(0, 15),
      approvalStatus: 'APPROVED',
      isOnline: false,
    });

    const vehicle = await vehicleRepo.save({
      driverId: driverProfile.id,
      vehicleType: 'MOTORBIKE',
      brand: 'Honda',
      modelName: 'Vision',
      licensePlate: `SET-${suffix}`,
      isActive: true,
      verificationStatus: 'APPROVED',
    });

    // Ví tài xế bắt đầu từ 0 để có thể khẳng định số dư SAU quyết toán bằng
    // giá trị tuyệt đối, không cần so lệch trước/sau như ví nền tảng.
    await walletRepo.save({ userId: driverUser.id, balance: '0' });

    const customer = await customerRepo.save({
      fullName: 'Settlement Khách hàng',
      phoneNumber: `0911${suffix}`.slice(0, 15),
    });

    const ride = await rideRepo.save({
      rideCode: `SET-${suffix}`.slice(0, 20),
      customerId: customer.id,
      driverId: driverProfile.id,
      vehicleId: vehicle.id,
      pickupAddress: 'Điểm đón kiểm thử quyết toán',
      pickupLatitude: '21.0067000',
      pickupLongitude: '105.8431000',
      dropoffAddress: 'Điểm trả kiểm thử quyết toán',
      dropoffLatitude: '21.0367000',
      dropoffLongitude: '105.7826000',
      vehicleType: 'MOTORBIKE',
      distanceKm: '10.00',
      estimatedFare: finalFareOverride,
      paymentMethod,
      status: 'IN_PROGRESS',
      createdBy: adminUser.id,
    });

    const platformWalletBefore = await findPlatformWallet();

    return {
      suffix,
      adminUserId: adminUser.id,
      driverUserId: driverUser.id,
      driverProfileId: driverProfile.id,
      vehicleId: vehicle.id,
      customerId: customer.id,
      rideId: ride.id,
      rideCode: ride.rideCode,
      driverToken: signAccessToken(driverUser.id),
      platformWalletId: platformWalletBefore.id,
      platformBalanceBefore: platformWalletBefore.balance,
    };
  }

  // Dọn dẹp theo đúng thứ tự phụ thuộc FK, và khôi phục số dư ví nền tảng
  // (dữ liệu CHIA SẺ có sẵn) về đúng giá trị trước khi test này chạy.
  async function cleanupFixture(fixture: SettlementFixture): Promise<void> {
    if (!fixture) return;

    await safeCleanup([
      // Khôi phục số dư ví nền tảng (dữ liệu CHIA SẺ có sẵn) về đúng giá trị
      // trước khi test này chạy.
      async () => {
        const platformWalletAfter = await dataSource
          .getRepository(Wallet)
          .findOne({ where: { id: fixture.platformWalletId } });
        if (platformWalletAfter) {
          const delta =
            Number(platformWalletAfter.balance) - fixture.platformBalanceBefore;
          if (delta !== 0) {
            await dataSource
              .createQueryBuilder()
              .update(Wallet)
              .set({ balance: () => 'balance - :delta' })
              .setParameter('delta', delta)
              .where('id = :id', { id: fixture.platformWalletId })
              .execute();
          }
        }
      },
      // WalletTransaction trước (FK_WT_Ride / FK_WT_Wallet đều NO ACTION —
      // không tự dọn theo khi xóa Ride hay Wallet).
      () =>
        dataSource
          .getRepository(WalletTransaction)
          .delete({ rideId: fixture.rideId }),
      // Ride xóa trước (cascade RideOffer/RideStatusHistory), rồi tới các
      // bảng bị Ride tham chiếu (NO ACTION).
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

  describe('T02 — gọi COMPLETED hai lần liên tiếp (BR-64, idempotent)', () => {
    let fixture: SettlementFixture;

    beforeEach(async () => {
      fixture = await createFixture('50000', 'CASH');
    });

    afterEach(async () => {
      await cleanupFixture(fixture);
    });

    it('một request 200, một request 409; chỉ MỘT WalletTransaction COMMISSION_FEE; ví chỉ bị trừ một lần', async () => {
      const call = () =>
        request(app.getHttpServer())
          .patch(`/api/v1/rides/${fixture.rideId}/status`)
          .set('Authorization', `Bearer ${fixture.driverToken}`)
          .send({ status: 'COMPLETED' });

      const [responseA, responseB] = await Promise.all([call(), call()]);

      const statuses = [responseA.status, responseB.status].sort(
        (a, b) => a - b,
      );
      expect(statuses).toEqual([200, 409]);

      const loser = responseA.status === 409 ? responseA : responseB;
      expect(loser.body.errorCode).toBe('INVALID_STATE_TRANSITION');

      const commissionRate = await getCommissionRate();
      const expectedFee = Math.round(50000 * commissionRate);

      const feeTransactions = await dataSource
        .getRepository(WalletTransaction)
        .find({
          where: { rideId: fixture.rideId, type: 'COMMISSION_FEE' },
        });
      expect(feeTransactions).toHaveLength(1);
      expect(Number(feeTransactions[0].amount)).toBe(expectedFee);

      const driverWallet = await dataSource
        .getRepository(Wallet)
        .findOne({ where: { userId: fixture.driverUserId } });
      expect(Number(driverWallet?.balance)).toBe(-expectedFee);
    });
  });

  describe('T09 — chuyến tiền mặt 100.000đ (BR-59, BR-61, BR-62)', () => {
    let fixture: SettlementFixture;

    beforeEach(async () => {
      fixture = await createFixture('100000', 'CASH');
    });

    afterEach(async () => {
      await cleanupFixture(fixture);
    });

    it('Ride.commissionRate/platformFee/driverEarning và cả hai ví đúng theo BR-59/61/62', async () => {
      const commissionRate = await getCommissionRate();
      expect(commissionRate).toBe(0.1);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/rides/${fixture.rideId}/status`)
        .set('Authorization', `Bearer ${fixture.driverToken}`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(200);
      expect(response.body.data.settlement).toEqual(
        expect.objectContaining({
          finalFare: 100000,
          commissionRate: 0.1,
          platformFee: 10000,
          driverEarning: 90000,
        }),
      );

      const rideRow = await dataSource
        .getRepository(Ride)
        .findOne({ where: { id: fixture.rideId } });
      expect(rideRow?.status).toBe('COMPLETED');
      expect(Number(rideRow?.finalFare)).toBe(100000);
      expect(Number(rideRow?.commissionRate)).toBe(0.1);
      expect(Number(rideRow?.platformFee)).toBe(10000);
      expect(Number(rideRow?.driverEarning)).toBe(90000);

      const driverWallet = await dataSource
        .getRepository(Wallet)
        .findOne({ where: { userId: fixture.driverUserId } });
      expect(Number(driverWallet?.balance)).toBe(-10000);

      const platformWalletAfter = await dataSource
        .getRepository(Wallet)
        .findOne({ where: { id: fixture.platformWalletId } });
      expect(
        Number(platformWalletAfter?.balance) - fixture.platformBalanceBefore,
      ).toBe(10000);

      const transactions = await dataSource
        .getRepository(WalletTransaction)
        .find({
          where: { rideId: fixture.rideId },
        });
      expect(transactions).toHaveLength(2);

      const feeTx = transactions.find((t) => t.type === 'COMMISSION_FEE');
      expect(feeTx?.direction).toBe('DEBIT');
      expect(Number(feeTx?.amount)).toBe(10000);
      expect(feeTx?.walletId).not.toBe(fixture.platformWalletId);

      const incomeTx = transactions.find((t) => t.type === 'COMMISSION_INCOME');
      expect(incomeTx?.direction).toBe('CREDIT');
      expect(Number(incomeTx?.amount)).toBe(10000);
      expect(incomeTx?.walletId).toBe(fixture.platformWalletId);
    });
  });
});
