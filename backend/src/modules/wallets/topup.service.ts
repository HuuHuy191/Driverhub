import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TopUpRequest } from './entities/top-up-request.entity';
import { Wallet } from './entities/wallet.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { WalletService } from './wallet.service';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { CreateTopupDto } from './dto/create-topup.dto';
import { RejectTopupDto } from './dto/reject-topup.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginationMeta } from '../drivers/drivers.service';

// BR-69
const TOPUP_MIN = 20_000;
const TOPUP_MAX = 5_000_000;

// UX_TopUp_PendingPerDriver (DATABASE.md mục 4.15) — lưới an toàn thứ hai ở
// tầng CSDL cho BR-70, phòng trường hợp hai request tạo yêu cầu nạp chạy
// đồng thời vượt qua được kiểm tra PENDING ở tầng service.
const DUPLICATE_PENDING_TOPUP_MARKER = 'UX_TopUp_PendingPerDriver';

export interface TopupRequestView {
  id: string;
  amount: number;
  receiptUrl: string | null;
  status: TopUpRequest['status'];
  rejectReason: string | null;
  createdAt: Date;
}

@Injectable()
export class TopupService {
  constructor(
    @InjectRepository(TopUpRequest)
    private readonly topupRepo: Repository<TopUpRequest>,
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly realtimeService: RealtimeService,
    private readonly settingsService: SettingsService,
  ) {}

  // API.md mục 8 (#52) — POST /wallet/topup. Ảnh biên lai tùy chọn.
  async create(
    userId: string,
    dto: CreateTopupDto,
    receiptFile?: Express.Multer.File,
  ): Promise<TopupRequestView> {
    const driver = await this.resolveDriverProfile(userId);

    // BR-69
    if (dto.amount < TOPUP_MIN || dto.amount > TOPUP_MAX) {
      throw new BusinessException(
        'TOPUP_AMOUNT_INVALID',
        ERROR_CODES.TOPUP_AMOUNT_INVALID.httpStatus,
        ERROR_CODES.TOPUP_AMOUNT_INVALID.message,
      );
    }

    // BR-70 — kiểm tra trước ở tầng service để trả đúng errorCode; ràng buộc
    // thật sự vẫn là filtered unique index UX_TopUp_PendingPerDriver.
    const existingPending = await this.topupRepo.findOne({
      where: { driverId: driver.id, status: 'PENDING' },
    });
    if (existingPending) {
      throw new BusinessException(
        'TOPUP_REQUEST_PENDING',
        ERROR_CODES.TOPUP_REQUEST_PENDING.httpStatus,
        ERROR_CODES.TOPUP_REQUEST_PENDING.message,
      );
    }

    // A3: upload Cloudinary TRƯỚC, ghi CSDL SAU.
    const receiptUrl = receiptFile
      ? await this.cloudinaryService.uploadImage(
          receiptFile,
          'driverhub/receipts',
        )
      : null;

    try {
      const topup = await this.topupRepo.save({
        driverId: driver.id,
        amount: dto.amount.toString(),
        receiptUrl,
        status: 'PENDING',
      });
      return this.toView(topup);
    } catch (error) {
      if (receiptUrl) {
        await this.cloudinaryService.deleteByUrl(receiptUrl);
      }
      if (
        error instanceof Error &&
        error.message.includes(DUPLICATE_PENDING_TOPUP_MARKER)
      ) {
        throw new BusinessException(
          'TOPUP_REQUEST_PENDING',
          ERROR_CODES.TOPUP_REQUEST_PENDING.httpStatus,
          ERROR_CODES.TOPUP_REQUEST_PENDING.message,
        );
      }
      throw error;
    }
  }

  // API.md mục 8 (#53) — GET /wallet/topup: danh sách yêu cầu của chính tài xế.
  async listMine(
    userId: string,
    query: PaginationDto,
  ): Promise<{ data: TopupRequestView[]; meta: PaginationMeta }> {
    const driver = await this.resolveDriverProfile(userId);
    const { page, limit } = query;

    const [rows, total] = await this.topupRepo.findAndCount({
      where: { driverId: driver.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: rows.map((row) => this.toView(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // API.md mục 8 (#54) — GET /admin/topup: yêu cầu chờ duyệt.
  async listPending(query: PaginationDto): Promise<{
    data: (TopupRequestView & {
      driver: { fullName: string; phoneNumber: string };
    })[];
    meta: PaginationMeta;
  }> {
    const { page, limit } = query;

    const [rows, total] = await this.topupRepo.findAndCount({
      where: { status: 'PENDING' },
      relations: ['driver'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: rows.map((row) => ({
        ...this.toView(row),
        driver: {
          fullName: row.driver.fullName,
          phoneNumber: row.driver.phoneNumber,
        },
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // API.md mục 8 (#55) — POST /admin/topup/:id/approve. BR-68: trong
  // transaction gọi WalletService.applyTransaction(type='TOPUP', direction='CREDIT').
  async approve(
    id: string,
    adminUserId: string,
  ): Promise<{ id: string; status: 'APPROVED'; walletBalanceAfter: number }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const topupRepo = queryRunner.manager.getRepository(TopUpRequest);
      const driverProfileRepo =
        queryRunner.manager.getRepository(DriverProfile);
      const walletRepo = queryRunner.manager.getRepository(Wallet);

      const topup = await topupRepo.findOne({ where: { id } });
      if (!topup) {
        throw new NotFoundException('Không tìm thấy yêu cầu nạp tiền');
      }
      if (topup.status !== 'PENDING') {
        throw new BusinessException(
          'INVALID_STATE_TRANSITION',
          ERROR_CODES.INVALID_STATE_TRANSITION.httpStatus,
          ERROR_CODES.INVALID_STATE_TRANSITION.message,
        );
      }

      const driver = await driverProfileRepo.findOne({
        where: { id: topup.driverId },
      });
      if (!driver) {
        throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
      }
      const wallet = await walletRepo.findOne({
        where: { userId: driver.userId },
      });
      if (!wallet) {
        throw new Error('Không tìm thấy ví của tài xế để duyệt nạp tiền.');
      }

      await topupRepo.update(topup.id, {
        status: 'APPROVED',
        reviewedBy: adminUserId,
        reviewedAt: () => 'SYSUTCDATETIME()',
      });

      const amount = Number(topup.amount);
      const tx = await this.walletService.applyTransaction(
        queryRunner.manager,
        {
          walletId: wallet.id,
          type: 'TOPUP',
          direction: 'CREDIT',
          amount,
          rideId: null,
          description: `Nạp tiền vào ví được duyệt (${amount.toLocaleString('vi-VN')}đ)`,
        },
      );

      const notification = await queryRunner.manager
        .getRepository(Notification)
        .save({
          userId: driver.userId,
          type: 'TOPUP_APPROVED',
          title: 'Yêu cầu nạp tiền đã được duyệt',
          body: `Ví của bạn đã được cộng ${amount.toLocaleString('vi-VN')}đ.`,
          dataJson: null,
        });

      await queryRunner.commitTransaction();

      // BR-74: "Ví thay đổi số dư" + "Yêu cầu nạp tiền được duyệt" — cả hai
      // đi qua Socket SAU KHI COMMIT (quy tắc 5).
      const walletBalanceAfter = Number(tx.balanceAfter);
      const maxNegativeBalance = this.settingsService.getNumber(
        'MAX_NEGATIVE_BALANCE',
      );
      this.realtimeService.emitWalletUpdated(driver.id, {
        balance: walletBalanceAfter,
        change: amount,
        type: 'TOPUP',
        description: notification.body,
        isBlocked: walletBalanceAfter < maxNegativeBalance,
      });
      this.realtimeService.emitNotificationToDriver(driver.id, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        dataJson: notification.dataJson,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });

      return {
        id: topup.id,
        status: 'APPROVED',
        walletBalanceAfter,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // API.md mục 8 (#56) — POST /admin/topup/:id/reject. Bắt buộc có lý do.
  async reject(
    id: string,
    dto: RejectTopupDto,
    adminUserId: string,
  ): Promise<{ id: string; status: 'REJECTED'; rejectReason: string }> {
    const topup = await this.topupRepo.findOne({ where: { id } });
    if (!topup) {
      throw new NotFoundException('Không tìm thấy yêu cầu nạp tiền');
    }
    if (topup.status !== 'PENDING') {
      throw new BusinessException(
        'INVALID_STATE_TRANSITION',
        ERROR_CODES.INVALID_STATE_TRANSITION.httpStatus,
        ERROR_CODES.INVALID_STATE_TRANSITION.message,
      );
    }

    await this.topupRepo.update(topup.id, {
      status: 'REJECTED',
      rejectReason: dto.reason,
      reviewedBy: adminUserId,
      reviewedAt: () => 'SYSUTCDATETIME()',
    });

    const driver = await this.driverProfileRepo.findOne({
      where: { id: topup.driverId },
    });
    if (driver) {
      const notification = await this.dataSource
        .getRepository(Notification)
        .save({
          userId: driver.userId,
          type: 'TOPUP_REJECTED',
          title: 'Yêu cầu nạp tiền bị từ chối',
          body: dto.reason,
          dataJson: null,
        });

      // BR-74: "Yêu cầu nạp tiền được duyệt / từ chối".
      this.realtimeService.emitNotificationToDriver(driver.id, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        dataJson: notification.dataJson,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });
    }

    return { id: topup.id, status: 'REJECTED', rejectReason: dto.reason };
  }

  private async resolveDriverProfile(userId: string): Promise<DriverProfile> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }
    return driver;
  }

  private toView(topup: TopUpRequest): TopupRequestView {
    return {
      id: topup.id,
      amount: Number(topup.amount),
      receiptUrl: topup.receiptUrl,
      status: topup.status,
      rejectReason: topup.rejectReason,
      createdAt: topup.createdAt,
    };
  }
}
