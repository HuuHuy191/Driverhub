import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { DriverProfile } from './entities/driver-profile.entity';
import { DriverDocument } from './entities/driver-document.entity';
import { User } from '../users/entities/user.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Ride } from '../rides/entities/ride.entity';
import { RealtimeService } from '../realtime/realtime.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { ListDriversDto } from './dto/list-drivers.dto';
import { RejectDriverDto } from './dto/reject-driver.dto';
import { LockDriverDto } from './dto/lock-driver.dto';

// BR-21: các trạng thái chuyến được coi là "dở dang" — chặn khóa tài khoản.
const ACTIVE_RIDE_STATUSES = ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] as const;

const SORTABLE_COLUMNS: Record<string, string> = {
  createdAt: 'dp.createdAt',
  fullName: 'dp.fullName',
  totalRides: 'dp.totalRides',
  cancelCount: 'dp.cancelCount',
};

export interface DriverListItemView {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  approvalStatus: string;
  isOnline: boolean;
  vehicle: { vehicleType: string; licensePlate: string } | null;
  walletBalance: number;
  totalRides: number;
  cancelCount: number;
  documentsCount: number;
  createdAt: Date;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(DriverDocument)
    private readonly driverDocumentRepo: Repository<DriverDocument>,
    @InjectRepository(Ride) private readonly rideRepo: Repository<Ride>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly realtimeService: RealtimeService,
  ) {}

  // API.md mục 3 (#11) — tài xế chỉ xem hồ sơ của chính mình.
  async getMyProfile(userId: string) {
    const driver = await this.driverProfileRepo.findOne({
      where: { userId },
      relations: ['user', 'vehicles'],
    });
    if (!driver) throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    return {
      id: driver.id,
      fullName: driver.fullName,
      phoneNumber: driver.phoneNumber,
      dateOfBirth: driver.dateOfBirth,
      citizenIdNumber: driver.citizenIdNumber,
      citizenIdIssueDate: driver.citizenIdIssueDate,
      driverLicenseNumber: driver.driverLicenseNumber,
      driverLicenseIssueDate: driver.driverLicenseIssueDate,
      temporaryAddress: driver.temporaryAddress,
      avatarUrl: driver.avatarUrl,
      email: driver.user.email,
      approvalStatus: driver.approvalStatus,
      rejectReason: driver.rejectReason,
      isOnline: driver.isOnline,
      vehicles: driver.vehicles.map((vehicle) => ({
        id: vehicle.id,
        vehicleType: vehicle.vehicleType,
        brand: vehicle.brand,
        modelName: vehicle.modelName,
        licensePlate: vehicle.licensePlate,
        color: vehicle.color,
        isActive: vehicle.isActive,
        verificationStatus: vehicle.verificationStatus,
      })),
    };
  }

  // BR-17: hồ sơ chỉ chuyển từ REJECTED về PENDING khi đủ thông tin xác minh.
  async resubmitProfile(
    userId: string,
  ): Promise<{ approvalStatus: 'PENDING' }> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Không tìm thấy hồ sơ tài xế');

    if (
      !driver.citizenIdNumber ||
      !driver.citizenIdIssueDate ||
      !driver.driverLicenseNumber ||
      !driver.driverLicenseIssueDate
    ) {
      throw new BusinessException(
        'IDENTITY_INFORMATION_INCOMPLETE',
        ERROR_CODES.IDENTITY_INFORMATION_INCOMPLETE.httpStatus,
        ERROR_CODES.IDENTITY_INFORMATION_INCOMPLETE.message,
      );
    }

    const result = await this.driverProfileRepo.update(
      { id: driver.id, approvalStatus: 'REJECTED' },
      { approvalStatus: 'PENDING', rejectReason: null },
    );
    if (result.affected !== 1) {
      throw new BusinessException(
        'INVALID_STATE_TRANSITION',
        ERROR_CODES.INVALID_STATE_TRANSITION.httpStatus,
        ERROR_CODES.INVALID_STATE_TRANSITION.message,
      );
    }
    return { approvalStatus: 'PENDING' };
  }

  // API.md mục 3 (#12) — không cho client sửa trạng thái duyệt hay online.
  async updateMyProfile(
    userId: string,
    dto: {
      fullName?: string;
      phoneNumber?: string;
      dateOfBirth?: string;
      citizenIdNumber?: string;
      citizenIdIssueDate?: string;
      driverLicenseNumber?: string;
      driverLicenseIssueDate?: string;
      temporaryAddress?: string;
    },
  ) {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    if (dto.phoneNumber && dto.phoneNumber !== driver.phoneNumber) {
      const exists = await this.driverProfileRepo.exist({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (exists)
        throw new BusinessException(
          'PHONE_ALREADY_EXISTS',
          409,
          ERROR_CODES.PHONE_ALREADY_EXISTS.message,
        );
    }
    await this.driverProfileRepo.update(driver.id, dto);
    return this.getMyProfile(userId);
  }

  // API.md mục 4.1 — GET /admin/drivers
  async findAll(
    query: ListDriversDto,
  ): Promise<{ data: DriverListItemView[]; meta: PaginationMeta }> {
    const { page, limit, sort, order, approvalStatus, isOnline, search } =
      query;

    const qb = this.driverProfileRepo
      .createQueryBuilder('dp')
      .leftJoinAndSelect('dp.user', 'user');

    if (approvalStatus) {
      qb.andWhere('dp.approvalStatus = :approvalStatus', { approvalStatus });
    }
    if (isOnline !== undefined) {
      qb.andWhere('dp.isOnline = :isOnline', { isOnline });
    }
    if (search) {
      qb.andWhere(
        '(dp.fullName LIKE :search OR dp.phoneNumber LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const sortColumn = SORTABLE_COLUMNS[sort] ?? SORTABLE_COLUMNS.createdAt;
    qb.orderBy(sortColumn, order.toUpperCase() as 'ASC' | 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [drivers, total] = await qb.getManyAndCount();

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    if (drivers.length === 0) {
      return { data: [], meta };
    }

    const driverIds = drivers.map((driver) => driver.id);
    const userIds = drivers.map((driver) => driver.userId);

    // BR-23: tối đa một xe isActive=1 mỗi tài xế -> join không nhân bản dòng.
    const [activeVehicles, wallets, documentCounts] = await Promise.all([
      this.vehicleRepo.find({
        where: { driverId: In(driverIds), isActive: true },
      }),
      this.walletRepo.find({ where: { userId: In(userIds) } }),
      this.driverDocumentRepo
        .createQueryBuilder('doc')
        .select('doc.driverId', 'driverId')
        .addSelect('COUNT(*)', 'count')
        .where('doc.driverId IN (:...driverIds)', { driverIds })
        .groupBy('doc.driverId')
        .getRawMany<{ driverId: string; count: string }>(),
    ]);

    const vehicleByDriver = new Map(activeVehicles.map((v) => [v.driverId, v]));
    const walletByUser = new Map(wallets.map((w) => [w.userId, w]));
    const docCountByDriver = new Map(
      documentCounts.map((row) => [row.driverId, Number(row.count)]),
    );

    const data: DriverListItemView[] = drivers.map((driver) => {
      const vehicle = vehicleByDriver.get(driver.id);
      const wallet = walletByUser.get(driver.userId);
      return {
        id: driver.id,
        fullName: driver.fullName,
        phoneNumber: driver.phoneNumber,
        email: driver.user.email,
        approvalStatus: driver.approvalStatus,
        rejectReason: driver.rejectReason,
        isOnline: driver.isOnline,
        vehicle: vehicle
          ? {
              vehicleType: vehicle.vehicleType,
              licensePlate: vehicle.licensePlate,
            }
          : null,
        walletBalance: wallet ? Number(wallet.balance) : 0,
        totalRides: driver.totalRides,
        cancelCount: driver.cancelCount,
        documentsCount: docCountByDriver.get(driver.id) ?? 0,
        createdAt: driver.createdAt,
      };
    });

    return { data, meta };
  }

  // API.md mục 4 (#25) — GET /admin/drivers/online.
  async findOnline(): Promise<
    {
      id: string;
      fullName: string;
      phoneNumber: string;
      latitude: number | null;
      longitude: number | null;
      lastLocationUpdatedAt: Date | null;
    }[]
  > {
    const drivers = await this.driverProfileRepo.find({
      where: { isOnline: true },
      order: { fullName: 'ASC' },
    });

    return drivers.map((driver) => ({
      id: driver.id,
      fullName: driver.fullName,
      phoneNumber: driver.phoneNumber,
      latitude:
        driver.currentLatitude !== null ? Number(driver.currentLatitude) : null,
      longitude:
        driver.currentLongitude !== null
          ? Number(driver.currentLongitude)
          : null,
      lastLocationUpdatedAt: driver.lastLocationUpdatedAt,
    }));
  }

  // GET /admin/drivers/:id — chi tiết hồ sơ kèm giấy tờ.
  async findOne(id: string) {
    const driver = await this.driverProfileRepo.findOne({
      where: { id },
      relations: ['user', 'vehicles', 'documents'],
    });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }

    const wallet = await this.walletRepo.findOne({
      where: { userId: driver.userId },
    });

    return {
      id: driver.id,
      fullName: driver.fullName,
      phoneNumber: driver.phoneNumber,
      dateOfBirth: driver.dateOfBirth,
      citizenIdNumber: driver.citizenIdNumber,
      citizenIdIssueDate: driver.citizenIdIssueDate,
      driverLicenseNumber: driver.driverLicenseNumber,
      driverLicenseIssueDate: driver.driverLicenseIssueDate,
      avatarUrl: driver.avatarUrl,
      temporaryAddress: driver.temporaryAddress,
      email: driver.user.email,
      userStatus: driver.user.status,
      approvalStatus: driver.approvalStatus,
      rejectReason: driver.rejectReason,
      approvedAt: driver.approvedAt,
      isOnline: driver.isOnline,
      totalRides: driver.totalRides,
      cancelCount: driver.cancelCount,
      walletBalance: wallet ? Number(wallet.balance) : null,
      vehicles: driver.vehicles.map((vehicle) => ({
        id: vehicle.id,
        vehicleType: vehicle.vehicleType,
        brand: vehicle.brand,
        modelName: vehicle.modelName,
        licensePlate: vehicle.licensePlate,
        color: vehicle.color,
        isActive: vehicle.isActive,
        verificationStatus: vehicle.verificationStatus,
      })),
      documents: driver.documents.map((document) => ({
        id: document.id,
        docType: document.docType,
        fileUrl: document.fileUrl,
        verificationStatus: document.verificationStatus,
        rejectReason: document.rejectReason,
        uploadedAt: document.uploadedAt,
        verifiedAt: document.verifiedAt,
      })),
      createdAt: driver.createdAt,
    };
  }

  // API.md mục 4.2 — POST /admin/drivers/:id/approve.
  // BR-19: 5 tác dụng phụ PHẢI chạy trong đúng một transaction. Dùng
  // QueryRunner tường minh (connect -> startTransaction -> commit/rollback
  // -> release trong finally) để kiểm soát trực tiếp vòng đời transaction,
  // thay vì callback DataSource.transaction().
  async approve(driverId: string, adminUserId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const driverRepo = queryRunner.manager.getRepository(DriverProfile);
      const userRepo = queryRunner.manager.getRepository(User);
      const vehicleRepo = queryRunner.manager.getRepository(Vehicle);
      const walletRepo = queryRunner.manager.getRepository(Wallet);
      const notificationRepo = queryRunner.manager.getRepository(Notification);

      const driver = await driverRepo.findOne({ where: { id: driverId } });
      if (!driver) {
        throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
      }

      // BR-17: chỉ hồ sơ đang PENDING mới được duyệt.
      if (driver.approvalStatus !== 'PENDING') {
        throw new BusinessException(
          'INVALID_STATE_TRANSITION',
          ERROR_CODES.INVALID_STATE_TRANSITION.httpStatus,
          ERROR_CODES.INVALID_STATE_TRANSITION.message,
        );
      }

      const approvedAt = new Date();

      // 1. DriverProfile.approvalStatus = APPROVED, ghi approvedAt/approvedBy
      await driverRepo.update(driver.id, {
        approvalStatus: 'APPROVED',
        approvedAt,
        approvedBy: adminUserId,
      });

      // 2. User.status = ACTIVE
      await userRepo.update(driver.userId, { status: 'ACTIVE' });

      // 3. Toàn bộ Vehicle của tài xế -> verificationStatus = APPROVED
      await vehicleRepo.update(
        { driverId: driver.id },
        { verificationStatus: 'APPROVED' },
      );

      // 4. Tạo Wallet nếu chưa có — BẮT BUỘC trước khi nhận chuyến đầu tiên
      const existingWallet = await walletRepo.findOne({
        where: { userId: driver.userId },
      });
      let walletCreated = false;
      if (!existingWallet) {
        await walletRepo.save({ userId: driver.userId, balance: '0' });
        walletCreated = true;
      }

      // 5. Thông báo cho tài xế
      await notificationRepo.save({
        userId: driver.userId,
        type: 'DRIVER_APPROVED',
        title: 'Hồ sơ đã được duyệt',
        body: 'Chúc mừng! Hồ sơ đối tác tài xế của bạn đã được duyệt. Bạn có thể bắt đầu nhận chuyến.',
        dataJson: null,
      });

      await queryRunner.commitTransaction();

      this.realtimeService.emitDriverApproved(driver.id, {
        approvalStatus: 'APPROVED',
        approvedAt,
      });

      return {
        id: driver.id,
        approvalStatus: 'APPROVED' as const,
        approvedAt,
        walletCreated,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // API.md mục 4.3 — POST /admin/drivers/:id/reject. BR-17: chỉ hồ sơ PENDING
  // mới bị từ chối. BR-18: lý do bắt buộc, tối thiểu 10 ký tự.
  async reject(driverId: string, dto: RejectDriverDto) {
    const driver = await this.driverProfileRepo.findOne({
      where: { id: driverId },
    });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }

    if (driver.approvalStatus !== 'PENDING') {
      throw new BusinessException(
        'INVALID_STATE_TRANSITION',
        ERROR_CODES.INVALID_STATE_TRANSITION.httpStatus,
        ERROR_CODES.INVALID_STATE_TRANSITION.message,
      );
    }

    const reason = dto.reason?.trim();
    if (!reason || reason.length < 10) {
      throw new BusinessException(
        'REJECT_REASON_REQUIRED',
        ERROR_CODES.REJECT_REASON_REQUIRED.httpStatus,
        ERROR_CODES.REJECT_REASON_REQUIRED.message,
      );
    }

    await this.driverProfileRepo.update(driver.id, {
      approvalStatus: 'REJECTED',
      rejectReason: reason,
    });

    this.realtimeService.emitDriverRejected(driver.id, {
      approvalStatus: 'REJECTED',
      rejectReason: reason,
    });

    return {
      id: driver.id,
      approvalStatus: 'REJECTED' as const,
      rejectReason: reason,
    };
  }

  // API.md mục 4 (#23) — PATCH /admin/drivers/:id/lock. BR-21: khóa thì thu
  // hồi toàn bộ refresh token + ép offline; không cho khóa nếu đang có chuyến
  // dở dang. Nhiều bước ghi liên quan -> QueryRunner tường minh như approve().
  async setLock(driverId: string, dto: LockDriverDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const driverRepo = queryRunner.manager.getRepository(DriverProfile);
      const userRepo = queryRunner.manager.getRepository(User);
      const rideRepo = queryRunner.manager.getRepository(Ride);
      const refreshTokenRepo = queryRunner.manager.getRepository(RefreshToken);

      const driver = await driverRepo.findOne({ where: { id: driverId } });
      if (!driver) {
        throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
      }

      if (dto.locked) {
        // BR-21: không cho khóa nếu tài xế đang có chuyến dở dang.
        const activeRideCount = await rideRepo.count({
          where: { driverId: driver.id, status: In([...ACTIVE_RIDE_STATUSES]) },
        });
        if (activeRideCount > 0) {
          throw new BusinessException(
            'ACTIVE_RIDE_EXISTS',
            ERROR_CODES.ACTIVE_RIDE_EXISTS.httpStatus,
            ERROR_CODES.ACTIVE_RIDE_EXISTS.message,
          );
        }

        await userRepo.update(driver.userId, { status: 'LOCKED' });

        // Thu hồi toàn bộ refresh token còn hiệu lực của tài khoản (BR-21).
        await refreshTokenRepo
          .createQueryBuilder()
          .update(RefreshToken)
          .set({ revokedAt: () => 'SYSUTCDATETIME()' })
          .where('userId = :userId', { userId: driver.userId })
          .andWhere('revokedAt IS NULL')
          .execute();

        // Đang online thì ép offline (BR-21).
        if (driver.isOnline) {
          await driverRepo.update(driver.id, { isOnline: false });
        }
      } else {
        await userRepo.update(driver.userId, { status: 'ACTIVE' });
      }

      await queryRunner.commitTransaction();

      return {
        id: driver.id,
        status: dto.locked ? ('LOCKED' as const) : ('ACTIVE' as const),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
