import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { DriverProfile } from '../../modules/drivers/entities/driver-profile.entity';
import { Vehicle, VehicleType } from '../../modules/vehicles/entities/vehicle.entity';
import { Wallet } from '../../modules/wallets/entities/wallet.entity';
import { Customer } from '../../modules/customers/entities/customer.entity';

const BCRYPT_COST = 10; // BR-06
const DEMO_PASSWORD = 'Demo@123456';

interface ApprovedDriverSeed {
  fullName: string;
  phoneNumber: string;
  email: string;
  district: string;
  latitude: string;
  longitude: string;
  vehicleType: VehicleType;
  licensePlate: string;
  brand: string;
  modelName: string;
}

// DATABASE.md mục 7.3 — 5 tài xế đã duyệt, rải quanh Hà Nội, phục vụ kiểm
// thử điều phối theo khoảng cách (BR-40, BR-41).
const APPROVED_DRIVERS: ApprovedDriverSeed[] = [
  {
    fullName: 'Nguyễn Văn An',
    phoneNumber: '0901000001',
    email: 'driver.caugiay@driverhub.local',
    district: 'Cầu Giấy',
    latitude: '21.0335000',
    longitude: '105.7938000',
    vehicleType: 'MOTORBIKE',
    licensePlate: '29A1-00001',
    brand: 'Honda',
    modelName: 'Wave Alpha',
  },
  {
    fullName: 'Trần Thị Bình',
    phoneNumber: '0901000002',
    email: 'driver.dongda@driverhub.local',
    district: 'Đống Đa',
    latitude: '21.0122000',
    longitude: '105.8252000',
    vehicleType: 'MOTORBIKE',
    licensePlate: '29B1-00002',
    brand: 'Yamaha',
    modelName: 'Sirius',
  },
  {
    fullName: 'Lê Văn Cường',
    phoneNumber: '0901000003',
    email: 'driver.haibatrung@driverhub.local',
    district: 'Hai Bà Trưng',
    latitude: '21.0069000',
    longitude: '105.8558000',
    vehicleType: 'CAR',
    licensePlate: '30A-00003',
    brand: 'Toyota',
    modelName: 'Vios',
  },
  {
    fullName: 'Phạm Thị Dung',
    phoneNumber: '0901000004',
    email: 'driver.thanhxuan@driverhub.local',
    district: 'Thanh Xuân',
    latitude: '20.9970000',
    longitude: '105.8072000',
    vehicleType: 'MOTORBIKE',
    licensePlate: '29C1-00004',
    brand: 'Honda',
    modelName: 'Vision',
  },
  {
    fullName: 'Hoàng Văn Em',
    phoneNumber: '0901000005',
    email: 'driver.namtuliem@driverhub.local',
    district: 'Nam Từ Liêm',
    latitude: '21.0136000',
    longitude: '105.7620000',
    vehicleType: 'CAR',
    licensePlate: '30A-00005',
    brand: 'Hyundai',
    modelName: 'Accent',
  },
];

// 2 tài xế đang chờ duyệt — phục vụ kiểm thử luồng phê duyệt.
const PENDING_DRIVERS = [
  { fullName: 'Vũ Thị Giang', phoneNumber: '0901000006', email: 'driver.pending1@driverhub.local' },
  { fullName: 'Đặng Văn Hải', phoneNumber: '0901000007', email: 'driver.pending2@driverhub.local' },
];

// 1 tài xế bị từ chối kèm lý do (BR-18: tối thiểu 10 ký tự).
const REJECTED_DRIVER = {
  fullName: 'Bùi Văn Khoa',
  phoneNumber: '0901000008',
  email: 'driver.rejected@driverhub.local',
  rejectReason:
    'Ảnh CCCD mờ, không đọc rõ thông tin. Vui lòng chụp lại và nộp hồ sơ mới.',
};

// 10 khách hàng mô phỏng.
const CUSTOMERS = [
  { fullName: 'Nguyễn Thị Lan', phoneNumber: '0912000001' },
  { fullName: 'Trần Văn Minh', phoneNumber: '0912000002' },
  { fullName: 'Lê Thị Ngọc', phoneNumber: '0912000003' },
  { fullName: 'Phạm Văn Phúc', phoneNumber: '0912000004' },
  { fullName: 'Hoàng Thị Quỳnh', phoneNumber: '0912000005' },
  { fullName: 'Vũ Văn Sơn', phoneNumber: '0912000006' },
  { fullName: 'Đỗ Thị Thảo', phoneNumber: '0912000007' },
  { fullName: 'Bùi Văn Tùng', phoneNumber: '0912000008' },
  { fullName: 'Ngô Thị Uyên', phoneNumber: '0912000009' },
  { fullName: 'Đinh Văn Việt', phoneNumber: '0912000010' },
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error('Thiếu SEED_ADMIN_EMAIL trong .env');
  }

  await AppDataSource.initialize();

  try {
    const userRepo = AppDataSource.getRepository(User);
    const customerRepo = AppDataSource.getRepository(Customer);

    // Idempotent (kiểm tra nhẹ): đã seed demo rồi thì bỏ qua, tránh crash vì
    // vi phạm UNIQUE khi lỡ chạy lại script này lần hai.
    const alreadySeeded = await customerRepo.findOne({
      where: { phoneNumber: CUSTOMERS[0].phoneNumber },
    });
    if (alreadySeeded) {
      console.log('Dữ liệu demo đã tồn tại — bỏ qua toàn bộ (không tạo trùng).');
      return;
    }

    const admin = await userRepo.findOne({ where: { email: adminEmail } });
    if (!admin) {
      throw new Error(
        `Không tìm thấy tài khoản Admin "${adminEmail}". Hãy chạy "npm run seed:admin" trước.`,
      );
    }

    const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);

    await AppDataSource.transaction(async (manager) => {
      const userRepoTx = manager.getRepository(User);
      const driverProfileRepoTx = manager.getRepository(DriverProfile);
      const vehicleRepoTx = manager.getRepository(Vehicle);
      const walletRepoTx = manager.getRepository(Wallet);
      const customerRepoTx = manager.getRepository(Customer);

      // ── 5 tài xế đã duyệt ──────────────────────────────────
      for (const seed of APPROVED_DRIVERS) {
        const user = await userRepoTx.save({
          email: seed.email,
          passwordHash: demoPasswordHash,
          role: 'DRIVER',
          status: 'ACTIVE',
        });

        const driver = await driverProfileRepoTx.save({
          userId: user.id,
          fullName: seed.fullName,
          phoneNumber: seed.phoneNumber,
          approvalStatus: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: admin.id,
          isOnline: false,
          currentLatitude: seed.latitude,
          currentLongitude: seed.longitude,
          lastLocationUpdatedAt: new Date(),
        });

        await vehicleRepoTx.save({
          driverId: driver.id,
          vehicleType: seed.vehicleType,
          brand: seed.brand,
          modelName: seed.modelName,
          licensePlate: seed.licensePlate,
          isActive: true,
          verificationStatus: 'APPROVED',
        });

        // BR-19 bước 4: ví phải tồn tại trước khi tài xế nhận chuyến đầu tiên.
        await walletRepoTx.save({ userId: user.id, balance: '0' });
      }

      // ── 2 tài xế đang chờ duyệt ────────────────────────────
      for (const seed of PENDING_DRIVERS) {
        const user = await userRepoTx.save({
          email: seed.email,
          passwordHash: demoPasswordHash,
          role: 'DRIVER',
          status: 'PENDING',
        });

        await driverProfileRepoTx.save({
          userId: user.id,
          fullName: seed.fullName,
          phoneNumber: seed.phoneNumber,
          approvalStatus: 'PENDING',
        });
        // Chưa duyệt -> chưa có ví (BR-19 bước 4 chỉ áp dụng khi APPROVED).
      }

      // ── 1 tài xế bị từ chối ────────────────────────────────
      const rejectedUser = await userRepoTx.save({
        email: REJECTED_DRIVER.email,
        passwordHash: demoPasswordHash,
        role: 'DRIVER',
        status: 'PENDING',
      });

      await driverProfileRepoTx.save({
        userId: rejectedUser.id,
        fullName: REJECTED_DRIVER.fullName,
        phoneNumber: REJECTED_DRIVER.phoneNumber,
        approvalStatus: 'REJECTED',
        rejectReason: REJECTED_DRIVER.rejectReason,
      });

      // ── 10 khách hàng ──────────────────────────────────────
      await customerRepoTx.save(CUSTOMERS);

      console.log(
        `Đã tạo ${APPROVED_DRIVERS.length} tài xế đã duyệt, ${PENDING_DRIVERS.length} tài xế chờ duyệt, ` +
          `1 tài xế bị từ chối, ${CUSTOMERS.length} khách hàng. Mật khẩu demo dùng chung: "${DEMO_PASSWORD}".`,
      );
      console.log('Chưa tạo chuyến hoàn thành — để buổi sau.');
    });
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('Seed dữ liệu demo thất bại:', err);
  process.exit(1);
});
