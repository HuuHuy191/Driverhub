import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ride, RideStatus } from './entities/ride.entity';
import { RideStatusHistory } from './entities/ride-status-history.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { RealtimeService } from '../realtime/realtime.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { CancelRideDto } from './dto/cancel-ride.dto';

const ADMIN_CANCELLABLE_STATUSES: RideStatus[] = [
  'SEARCHING',
  'ACCEPTED',
  'ARRIVED',
];
const DRIVER_CANCELLABLE_STATUSES: RideStatus[] = ['ACCEPTED', 'ARRIVED'];
const MIN_REASON_LENGTH = 5; // BR-50

export interface AdminCancelResult {
  id: string;
  status: 'CANCELLED';
  cancelledBy: 'ADMIN';
  cancelledAt: Date;
}

export interface DriverCancelResult {
  rideId: string;
  rideStatus: 'SEARCHING';
  redispatched: true;
  message: string;
}

// BR-48 -> BR-53 — hủy chuyến. Hai luồng khác hẳn nhau ở kết quả (Admin hủy
// hẳn, tài xế hủy thì quay về SEARCHING và điều phối lại) nên tách 2 method
// riêng thay vì một hàm dùng chung nhiều tham số cờ.
@Injectable()
export class RideCancelService {
  private readonly logger = new Logger(RideCancelService.name);

  constructor(
    @InjectRepository(Ride) private readonly rideRepo: Repository<Ride>,
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly realtimeService: RealtimeService,
    private readonly dispatchService: DispatchService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // API.md mục 7.7 — POST /admin/rides/:id/cancel. Kết thúc hẳn, KHÔNG điều
  // phối lại (khác driver ở mục 7.6).
  async cancelByAdmin(
    rideId: string,
    adminUserId: string,
    dto: CancelRideDto,
  ): Promise<AdminCancelResult> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) {
      throw new NotFoundException('Không tìm thấy chuyến');
    }

    const reason = this.validateReason(dto.reason);
    const cancelledAt = new Date();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // BR-33: điều kiện tranh chấp nằm TRONG WHERE. OUTPUT DELETED.status để
      // biết trạng thái cũ (ghi RideStatusHistory) trong CÙNG câu UPDATE,
      // đúng khuôn mẫu WalletService.applyTransaction() đang dùng OUTPUT.
      const updateResult = await queryRunner.manager
        .createQueryBuilder()
        .update(Ride)
        .set({
          status: 'CANCELLED',
          cancelledAt,
          cancelledBy: 'ADMIN',
          cancelReason: reason,
        })
        .where('id = :id', { id: rideId })
        .andWhere('status IN (:...statuses)', {
          statuses: ADMIN_CANCELLABLE_STATUSES,
        })
        .output('DELETED.status AS fromStatus')
        .execute();

      if (updateResult.affected !== 1) {
        throw this.buildCancelError(ride.status);
      }
      const fromStatus = updateResult.raw[0].fromStatus as RideStatus;

      // BR-34
      await queryRunner.manager.getRepository(RideStatusHistory).save({
        rideId,
        fromStatus,
        toStatus: 'CANCELLED',
        changedByType: 'ADMIN',
        changedById: adminUserId,
        note: reason,
      });

      await queryRunner.commitTransaction();

      // BR-52: KHÔNG có bút toán ví nào ở đây. Chỉ báo tài xế nếu đã được gán.
      if (ride.driverId) {
        this.realtimeService.emitRideCancelled(ride.driverId, {
          rideId,
          cancelledBy: 'ADMIN',
          reason,
        });

        // BR-74: "Chuyến bị Admin hủy" — lưu lịch sử thông báo, khác với sự
        // kiện ride:cancelled ở trên (chỉ để cập nhật UI ngay lập tức).
        const cancelledDriver = await this.driverProfileRepo.findOne({
          where: { id: ride.driverId },
        });
        if (cancelledDriver) {
          await this.notificationsService.create({
            userId: cancelledDriver.userId,
            type: 'RIDE_CANCELLED',
            title: 'Chuyến đã bị hủy',
            body: reason,
            dataJson: JSON.stringify({ rideId }),
          });
        }
      }

      return { id: rideId, status: 'CANCELLED', cancelledBy: 'ADMIN', cancelledAt };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // API.md mục 7.6 — POST /rides/:id/cancel. BR-51: chuyến quay về SEARCHING
  // và được điều phối lại; tài xế vừa hủy không nhận lại lời mời (BR-44).
  async cancelByDriver(
    rideId: string,
    userId: string,
    dto: CancelRideDto,
  ): Promise<DriverCancelResult> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }

    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) {
      throw new NotFoundException('Không tìm thấy chuyến');
    }

    // BR-32-kiểu ownership check — giống RideStatusService.updateStatus().
    if (ride.driverId !== driver.id) {
      throw new BusinessException(
        'NOT_RIDE_OWNER',
        ERROR_CODES.NOT_RIDE_OWNER.httpStatus,
        ERROR_CODES.NOT_RIDE_OWNER.message,
      );
    }

    const reason = this.validateReason(dto.reason);
    const cancelledAt = new Date();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const updateResult = await queryRunner.manager
        .createQueryBuilder()
        .update(Ride)
        .set({
          status: 'SEARCHING',
          driverId: null,
          vehicleId: null,
          acceptedAt: null,
          arrivedAt: null,
          cancelledBy: 'DRIVER',
          cancelReason: reason,
          cancelledAt,
        })
        .where('id = :id', { id: rideId })
        .andWhere('status IN (:...statuses)', {
          statuses: DRIVER_CANCELLABLE_STATUSES,
        })
        .andWhere('driverId = :driverId', { driverId: driver.id })
        .output('DELETED.status AS fromStatus')
        .execute();

      if (updateResult.affected !== 1) {
        throw this.buildCancelError(ride.status);
      }
      const fromStatus = updateResult.raw[0].fromStatus as RideStatus;

      // BR-53
      await queryRunner.manager
        .createQueryBuilder()
        .update(DriverProfile)
        .set({ cancelCount: () => 'cancelCount + 1' })
        .where('id = :id', { id: driver.id })
        .execute();

      // BR-34
      await queryRunner.manager.getRepository(RideStatusHistory).save({
        rideId,
        fromStatus,
        toStatus: 'SEARCHING',
        changedByType: 'DRIVER',
        changedById: userId,
        note: reason,
      });

      await queryRunner.commitTransaction();

      this.realtimeService.emitRideStatusChanged({
        rideId,
        rideCode: ride.rideCode,
        fromStatus,
        toStatus: 'SEARCHING',
        at: cancelledAt,
      });

      // BR-51 — điều phối lại, KHÔNG await (không chặn response hủy chuyến).
      // RideOffer(ACCEPTED) cũ của driver này vẫn còn -> UQ_RideOffer_Ride_Driver
      // + điều kiện 8 (BR-40) tự loại anh ta khỏi vòng mới, không cần code thêm.
      this.dispatchService
        .startDispatch(rideId)
        .catch((error) =>
          this.logger.error(`startDispatch(${rideId}) thất bại`, error),
        );

      return {
        rideId,
        rideStatus: 'SEARCHING',
        redispatched: true,
        message: 'Chuyến đã được chuyển cho tài xế khác',
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

  // BR-50: lý do bắt buộc, tối thiểu 5 ký tự — dùng chung cho cả 2 luồng.
  private validateReason(reason: string | undefined): string {
    const trimmed = reason?.trim();
    if (!trimmed || trimmed.length < MIN_REASON_LENGTH) {
      throw new BusinessException(
        'CANCEL_REASON_REQUIRED',
        ERROR_CODES.CANCEL_REASON_REQUIRED.httpStatus,
        ERROR_CODES.CANCEL_REASON_REQUIRED.message,
      );
    }
    return trimmed;
  }

  // BR-49: IN_PROGRESS luôn là CANNOT_CANCEL_IN_PROGRESS; các trạng thái kết
  // thúc khác (COMPLETED/CANCELLED/NO_DRIVER_FOUND) là INVALID_STATE_TRANSITION.
  private buildCancelError(currentStatus: RideStatus): BusinessException {
    if (currentStatus === 'IN_PROGRESS') {
      return new BusinessException(
        'CANNOT_CANCEL_IN_PROGRESS',
        ERROR_CODES.CANNOT_CANCEL_IN_PROGRESS.httpStatus,
        ERROR_CODES.CANNOT_CANCEL_IN_PROGRESS.message,
      );
    }
    return new BusinessException(
      'INVALID_STATE_TRANSITION',
      ERROR_CODES.INVALID_STATE_TRANSITION.httpStatus,
      ERROR_CODES.INVALID_STATE_TRANSITION.message,
    );
  }
}
