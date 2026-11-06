import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ride, RideStatus } from './entities/ride.entity';
import { RideStatusHistory } from './entities/ride-status-history.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { WalletService } from '../wallets/wallet.service';
import { SettingsService } from '../settings/settings.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { UpdateRideStatusDto } from './dto/update-ride-status.dto';

type SimpleTransitionTarget = 'ARRIVED' | 'IN_PROGRESS';

// BUSINESS-RULES.md mục 6.2 — với tác nhân DRIVER, mỗi trạng thái đích ở đây
// có ĐÚNG MỘT trạng thái nguồn hợp lệ, nên không cần đọc status hiện tại ra
// trước để quyết định (BR-33) — cứ đưa thẳng vào WHERE của UPDATE.
const REQUIRED_FROM_STATUS: Record<SimpleTransitionTarget, RideStatus> = {
  ARRIVED: 'ACCEPTED',
  IN_PROGRESS: 'ARRIVED',
};

const TIMESTAMP_COLUMN: Record<
  SimpleTransitionTarget,
  'arrivedAt' | 'startedAt'
> = {
  ARRIVED: 'arrivedAt',
  IN_PROGRESS: 'startedAt',
};

export interface RideSettlement {
  finalFare: number;
  commissionRate: number;
  platformFee: number;
  driverEarning: number;
  walletBalanceAfter: number | null;
  note: string;
}

export interface UpdateRideStatusResult {
  id: string;
  status: RideStatus;
  arrivedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  settlement?: RideSettlement;
}

@Injectable()
export class RideStatusService {
  constructor(
    @InjectRepository(Ride) private readonly rideRepo: Repository<Ride>,
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
    // BR-56: mọi thay đổi số dư ví (kể cả trong transaction quyết toán này)
    // PHẢI đi qua WalletService.applyTransaction() — không tự UPDATE Wallet ở đây.
    private readonly walletService: WalletService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // API.md mục 7.5 — PATCH /rides/:id/status.
  async updateStatus(
    rideId: string,
    userId: string,
    dto: UpdateRideStatusDto,
  ): Promise<UpdateRideStatusResult> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }

    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) {
      throw new NotFoundException('Không tìm thấy chuyến');
    }

    // BR-32: chỉ tài xế được gán (Ride.driverId) mới được cập nhật chuyến
    // này. Đây là kiểm tra sở hữu, không phải trạng thái — không đổi qua
    // lại theo kiểu tranh chấp như BR-45 nên đọc trước rồi so sánh là an toàn.
    if (ride.driverId !== driver.id) {
      throw new BusinessException(
        'NOT_RIDE_OWNER',
        ERROR_CODES.NOT_RIDE_OWNER.httpStatus,
        ERROR_CODES.NOT_RIDE_OWNER.message,
      );
    }

    if (dto.status === 'COMPLETED') {
      return this.completeRide(ride, driver, userId);
    }

    return this.transitionRide(ride, driver, dto.status, userId);
  }

  // ARRIVED / IN_PROGRESS — đổi trạng thái đơn thuần, chưa quyết toán.
  private async transitionRide(
    ride: Ride,
    driver: DriverProfile,
    target: SimpleTransitionTarget,
    userId: string,
  ): Promise<UpdateRideStatusResult> {
    const requiredFrom = REQUIRED_FROM_STATUS[target];
    const timestampColumn = TIMESTAMP_COLUMN[target];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // BR-33: điều kiện tranh chấp nằm TRONG WHERE của chính UPDATE, không
      // SELECT trạng thái ra rồi mới quyết định ghi.
      const updateResult = await queryRunner.manager
        .createQueryBuilder()
        .update(Ride)
        .set({ status: target, [timestampColumn]: () => 'SYSUTCDATETIME()' })
        .where('id = :id', { id: ride.id })
        .andWhere('status = :from', { from: requiredFrom })
        .andWhere('driverId = :driverId', { driverId: driver.id })
        .execute();

      if (updateResult.affected !== 1) {
        throw new BusinessException(
          'INVALID_STATE_TRANSITION',
          ERROR_CODES.INVALID_STATE_TRANSITION.httpStatus,
          ERROR_CODES.INVALID_STATE_TRANSITION.message,
        );
      }

      // BR-34
      await queryRunner.manager.getRepository(RideStatusHistory).save({
        rideId: ride.id,
        fromStatus: requiredFrom,
        toStatus: target,
        changedByType: 'DRIVER',
        changedById: userId,
        note: null,
      });

      await queryRunner.commitTransaction();

      const changedAt = new Date();
      this.realtimeService.emitRideStatusChanged({
        rideId: ride.id,
        rideCode: ride.rideCode,
        fromStatus: requiredFrom,
        toStatus: target,
        driverId: driver.id,
        driverName: driver.fullName,
        at: changedAt,
      });

      return { id: ride.id, status: target, [timestampColumn]: changedAt };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // COMPLETED — BR-63: toàn bộ quy trình quyết toán trong MỘT transaction.
  private async completeRide(
    ride: Ride,
    driver: DriverProfile,
    userId: string,
  ): Promise<UpdateRideStatusResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // (2)+(3) TÍNH TRƯỚC khi ghi: finalFare/commissionRate/platformFee/
      // driverEarning phải có mặt NGAY TRONG câu UPDATE chuyển status sang
      // COMPLETED — CK_R_Settled (DATABASE.md mục 4.10) bắt buộc 4 cột này
      // NOT NULL ngay khi status='COMPLETED', nên không thể tách hai câu
      // UPDATE (chốt status trước, ghi số tiền sau) như BR-63 mô tả từng
      // bước: sẽ vi phạm CHECK constraint ngay ở câu UPDATE đầu tiên.
      // finalFare đọc từ `ride` (lấy TRƯỚC transaction, ở updateStatus()) —
      // dữ liệu này không đổi ngoài chính bước hoàn thành nên không nằm
      // trong bề mặt tranh chấp mà BR-33/BR-45 lo ngại.
      const finalFare =
        ride.finalFare !== null
          ? Number(ride.finalFare)
          : Number(ride.estimatedFare);
      const commissionRate = this.settingsService.getNumber('COMMISSION_RATE');
      const platformFee = Math.round(finalFare * commissionRate);
      const driverEarning = finalFare - platformFee;

      // (1) Chốt trạng thái — đồng thời là chốt chặn idempotent (BR-64 lớp 1).
      // Gọi hai lần liên tiếp (T02): lần đầu affected=1 và đi tiếp; lần hai
      // WHERE status='IN_PROGRESS' không còn khớp -> affected=0 -> 409 ngay,
      // không chạm tới bất kỳ bước ghi ví nào bên dưới.
      const updateResult = await queryRunner.manager
        .createQueryBuilder()
        .update(Ride)
        .set({
          status: 'COMPLETED',
          completedAt: () => 'SYSUTCDATETIME()',
          finalFare: finalFare.toString(),
          commissionRate: commissionRate.toString(),
          platformFee: platformFee.toString(),
          driverEarning: driverEarning.toString(),
        })
        .where('id = :id', { id: ride.id })
        .andWhere('status = :from', { from: 'IN_PROGRESS' })
        .andWhere('driverId = :driverId', { driverId: driver.id })
        .execute();

      if (updateResult.affected !== 1) {
        throw new BusinessException(
          'INVALID_STATE_TRANSITION',
          ERROR_CODES.INVALID_STATE_TRANSITION.httpStatus,
          ERROR_CODES.INVALID_STATE_TRANSITION.message,
        );
      }

      // (5) BR-34
      await queryRunner.manager.getRepository(RideStatusHistory).save({
        rideId: ride.id,
        fromStatus: 'IN_PROGRESS',
        toStatus: 'COMPLETED',
        changedByType: 'DRIVER',
        changedById: userId,
        note: null,
      });

      // (6) BR-61/BR-62: khách trả CASH -> nền tảng chưa nhận được đồng nào
      // -> trừ phí vào ví tài xế + cộng vào ví nền tảng, ghi sổ kép. BR-56:
      // cả hai bút toán đi qua WalletService.applyTransaction() với chính
      // queryRunner.manager hiện tại để nằm chung transaction quyết toán này.
      let walletBalanceAfter: number | null = null;
      if (ride.paymentMethod === 'CASH' && platformFee > 0) {
        const driverWallet = await queryRunner.manager
          .getRepository(Wallet)
          .findOne({ where: { userId } });
        if (!driverWallet) {
          throw new Error('Không tìm thấy ví tài xế để quyết toán.');
        }
        const platformWallet = await this.walletService.findPlatformWallet(
          queryRunner.manager,
        );
        if (!platformWallet) {
          throw new Error('Không tìm thấy ví nền tảng để quyết toán.');
        }

        // (6a) Trừ ví tài xế.
        const feeTx = await this.walletService.applyTransaction(
          queryRunner.manager,
          {
            walletId: driverWallet.id,
            rideId: ride.id,
            type: 'COMMISSION_FEE',
            direction: 'DEBIT',
            amount: platformFee,
            description: `Phí nền tảng ${Math.round(commissionRate * 100)}% chuyến ${ride.rideCode}`,
          },
        );
        walletBalanceAfter = Number(feeTx.balanceAfter);

        // (6b) Cộng ví nền tảng — bút toán đối ứng (BR-62: ghi sổ kép).
        await this.walletService.applyTransaction(queryRunner.manager, {
          walletId: platformWallet.id,
          rideId: ride.id,
          type: 'COMMISSION_INCOME',
          direction: 'CREDIT',
          amount: platformFee,
          description: `Thu phí nền tảng chuyến ${ride.rideCode}`,
        });
      }

      await queryRunner.commitTransaction();

      // Ngoài transaction (API.md mục 7.5 / BR-63 cuối):
      const completedAt = new Date();
      this.realtimeService.emitRideStatusChanged({
        rideId: ride.id,
        rideCode: ride.rideCode,
        fromStatus: 'IN_PROGRESS',
        toStatus: 'COMPLETED',
        driverId: driver.id,
        driverName: driver.fullName,
        at: completedAt,
      });
      if (walletBalanceAfter !== null) {
        const maxNegativeBalance = this.settingsService.getNumber(
          'MAX_NEGATIVE_BALANCE',
        );
        const isBlocked = walletBalanceAfter < maxNegativeBalance;
        this.realtimeService.emitWalletUpdated(driver.id, {
          balance: walletBalanceAfter,
          change: -platformFee,
          type: 'COMMISSION_FEE',
          description: `Phí nền tảng ${Math.round(commissionRate * 100)}% chuyến ${ride.rideCode}`,
          isBlocked,
        });

        // BR-74 "Ví âm vượt ngưỡng" + BR-67: ép offline ngay vì driver không
        // còn đủ điều kiện BR-26 điều kiện 4 để tiếp tục nhận chuyến. Chạy
        // NGOÀI transaction quyết toán — không phải một phần bắt buộc của
        // việc chốt sổ tiền, lỡ có trục trặc thì lần bật online kế tiếp
        // (DriverStatusService.turnOnline) vẫn tự chặn lại đúng theo BR-26.
        if (isBlocked && driver.isOnline) {
          await this.driverProfileRepo.update(driver.id, { isOnline: false });
          this.realtimeService.emitDriverForceOffline(driver.id, {
            reason: 'Ví của bạn đang âm vượt mức cho phép',
          });
          await this.notificationsService.create({
            userId,
            type: 'WALLET_NEGATIVE_THRESHOLD',
            title: 'Ví của bạn đang âm vượt mức cho phép',
            body: 'Vui lòng nạp tiền để tiếp tục nhận chuyến. Bạn đã bị chuyển sang trạng thái offline.',
            dataJson: JSON.stringify({ balance: walletBalanceAfter }),
          });
        }
      }

      return {
        id: ride.id,
        status: 'COMPLETED',
        // Giá trị hiển thị — cột completedAt thật trong CSDL được chính CSDL
        // ghi bằng SYSUTCDATETIME() ở câu UPDATE phía trên, không phải giá
        // trị này; không cần SELECT lại chỉ để lấy đúng millisecond.
        completedAt,
        settlement: {
          finalFare,
          commissionRate,
          platformFee,
          driverEarning,
          walletBalanceAfter,
          note:
            ride.paymentMethod === 'CASH'
              ? 'Khách trả tiền mặt. Phí nền tảng được trừ vào ví.'
              : 'Thanh toán qua ví — không phát sinh thêm giao dịch phí.',
        },
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
}
