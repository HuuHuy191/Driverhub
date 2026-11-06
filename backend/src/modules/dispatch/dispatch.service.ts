import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Ride } from '../rides/entities/ride.entity';
import { RideOffer } from '../rides/entities/ride-offer.entity';
import { RideStatusHistory } from '../rides/entities/ride-status-history.entity';
import { SettingsService } from '../settings/settings.service';
import { RealtimeService } from '../realtime/realtime.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { DriverMatcherService, EligibleDriver } from './driver-matcher.service';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    @InjectRepository(Ride) private readonly rideRepo: Repository<Ride>,
    @InjectRepository(RideOffer)
    private readonly rideOfferRepo: Repository<RideOffer>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
    private readonly driverMatcher: DriverMatcherService,
    private readonly realtimeService: RealtimeService,
  ) {}

  // BR-42 — vòng lặp điều phối. Chạy nền: người gọi (RidesService.create(),
  // RideCancelService.cancelByDriver(), DispatchService.redispatch()) KHÔNG
  // await hàm này, chỉ .catch() để không lọt unhandled rejection. Vòng lặp
  // trải dài qua nhiều giây chờ (sleep OFFER_TIMEOUT_SECONDS) nên app/kết nối
  // CSDL hoàn toàn có thể đã đóng giữa chừng (vd. app.close() lúc tắt test) —
  // mọi bước đều kiểm tra dataSource.isInitialized trước khi truy vấn tiếp.
  async startDispatch(rideId: string): Promise<void> {
    try {
      if (!this.ensureConnected()) return;
      const ride = await this.rideRepo.findOne({
        where: { id: rideId },
        relations: ['customer'],
      });
      if (!ride) {
        return;
      }

      const maxRounds = this.settingsService.getNumber('DISPATCH_MAX_ROUNDS');
      const batchSize = this.settingsService.getNumber('DISPATCH_BATCH_SIZE');
      const offerTimeoutSeconds = this.settingsService.getNumber(
        'OFFER_TIMEOUT_SECONDS',
      );

      for (let round = 1; round <= maxRounds; round++) {
        if (!this.ensureConnected()) return;

        const drivers = await this.driverMatcher.findEligibleDrivers(
          rideId,
          Number(ride.pickupLatitude),
          Number(ride.pickupLongitude),
          ride.vehicleType,
          batchSize,
        );

        if (drivers.length === 0) {
          if (round === 1) {
            await this.markNoDriverFound(ride, round);
            return;
          }
          await sleep(offerTimeoutSeconds * 1000);
          break;
        }

        if (!this.ensureConnected()) return;

        const expiredAt = new Date(Date.now() + offerTimeoutSeconds * 1000);
        const insertResult = await this.rideOfferRepo.insert(
          drivers.map((driver) => ({
            rideId,
            driverId: driver.id,
            status: 'SENT' as const,
            round,
            distanceKm: driver.distanceKm.toString(),
            expiredAt,
          })),
        );

        // InsertResult.identifiers giữ đúng thứ tự với mảng vừa insert ở trên.
        drivers.forEach((driver, index) => {
          const offerId = insertResult.identifiers[index]?.id as
            | string
            | undefined;
          this.realtimeService.emitRideOffer(
            driver.id,
            this.buildOfferPayload(ride, driver, expiredAt, offerId),
          );
        });

        await this.rideRepo.update(rideId, { dispatchRound: round });
        this.realtimeService.emitDispatchRoundStarted({
          rideId,
          round,
          driversNotified: drivers.length,
        });

        await sleep(offerTimeoutSeconds * 1000);

        if (!this.ensureConnected()) return;

        const current = await this.rideRepo.findOne({ where: { id: rideId } });
        if (!current || current.status !== 'SEARCHING') {
          return;
        }

        const expiredOffers = await this.rideOfferRepo.find({
          where: { rideId, round, status: In(['SENT', 'VIEWED']) },
        });
        if (expiredOffers.length > 0) {
          await this.rideOfferRepo.update(
            { rideId, round, status: In(['SENT', 'VIEWED']) },
            { status: 'EXPIRED' },
          );
          for (const offer of expiredOffers) {
            this.realtimeService.emitOfferExpired(offer.driverId, {
              offerId: offer.id,
              rideId,
            });
          }
        }
      }

      if (!this.ensureConnected()) return;

      const finalRide = await this.rideRepo.findOne({ where: { id: rideId } });
      if (finalRide && finalRide.status === 'SEARCHING') {
        await this.markNoDriverFound(finalRide, finalRide.dispatchRound);
      }
    } catch (error) {
      // Phòng trường hợp kết nối đóng đúng lúc giữa this.ensureConnected()
      // và câu truy vấn ngay sau đó (TOCTOU hiếm) — không để lọt lên thành
      // unhandled rejection hay log mức error gây nhiễu cho một tình huống
      // bình thường khi app/test đang tắt.
      if (this.isConnectionClosedError(error)) {
        this.logger.debug(
          `startDispatch(${rideId}) dừng giữa chừng vì kết nối CSDL đã đóng.`,
        );
        return;
      }
      throw error;
    }
  }

  private ensureConnected(): boolean {
    if (!this.dataSource.isInitialized) {
      this.logger.debug(
        'DataSource đã đóng — dừng vòng lặp điều phối giữa chừng.',
      );
      return false;
    }
    return true;
  }

  private isConnectionClosedError(error: unknown): boolean {
    return (
      error instanceof Error && /connection is closed/i.test(error.message)
    );
  }

  // POST /admin/rides/:id/redispatch — chỉ áp dụng cho chuyến NO_DRIVER_FOUND.
  async redispatch(
    rideId: string,
    adminUserId: string,
  ): Promise<{ id: string; status: 'SEARCHING' }> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) {
      throw new NotFoundException('Không tìm thấy chuyến');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const updateResult = await queryRunner.manager
        .createQueryBuilder()
        .update(Ride)
        .set({ status: 'SEARCHING', dispatchRound: 0 })
        .where('id = :id', { id: rideId })
        .andWhere('status = :from', { from: 'NO_DRIVER_FOUND' })
        .execute();

      if (updateResult.affected !== 1) {
        throw new BusinessException(
          'INVALID_STATE_TRANSITION',
          ERROR_CODES.INVALID_STATE_TRANSITION.httpStatus,
          ERROR_CODES.INVALID_STATE_TRANSITION.message,
        );
      }

      await queryRunner.manager.getRepository(RideStatusHistory).save({
        rideId,
        fromStatus: 'NO_DRIVER_FOUND',
        toStatus: 'SEARCHING',
        changedByType: 'ADMIN',
        changedById: adminUserId,
        note: 'Điều phối lại thủ công',
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }

    this.startDispatch(rideId).catch((error) =>
      this.logger.error(`startDispatch(${rideId}) thất bại`, error),
    );

    return { id: rideId, status: 'SEARCHING' };
  }

  // UPDATE có điều kiện (BR-33): chỉ chuyển NO_DRIVER_FOUND nếu ride vẫn
  // đang SEARCHING đúng lúc gọi — tránh ghi đè lên một ride vừa được nhận.
  private async markNoDriverFound(ride: Ride, roundsTried: number): Promise<void> {
    const updateResult = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({ status: 'NO_DRIVER_FOUND' })
      .where('id = :id', { id: ride.id })
      .andWhere('status = :from', { from: 'SEARCHING' })
      .execute();

    if (updateResult.affected === 1) {
      this.realtimeService.emitNoDriverFound({
        rideId: ride.id,
        rideCode: ride.rideCode,
        roundsTried,
      });
    }
  }

  // Hình dạng giống GET /rides/offers (API.md mục 7.3 / 12.4).
  private buildOfferPayload(
    ride: Ride,
    driver: EligibleDriver,
    expiredAt: Date,
    offerId: string | undefined,
  ): Record<string, unknown> {
    const estimatedFare = Number(ride.estimatedFare);
    const commissionRate = this.settingsService.getNumber('COMMISSION_RATE');
    const platformFee = Math.round(estimatedFare * commissionRate);

    return {
      offerId,
      rideId: ride.id,
      rideCode: ride.rideCode,
      customerName: ride.customer.fullName,
      pickupAddress: ride.pickupAddress,
      pickupLatitude: Number(ride.pickupLatitude),
      pickupLongitude: Number(ride.pickupLongitude),
      dropoffAddress: ride.dropoffAddress,
      dropoffLatitude: Number(ride.dropoffLatitude),
      dropoffLongitude: Number(ride.dropoffLongitude),
      distanceKm: Number(ride.distanceKm),
      distanceToPickupKm: driver.distanceKm,
      estimatedFare,
      estimatedEarning: estimatedFare - platformFee,
      paymentMethod: ride.paymentMethod,
      expiredAt,
      remainingSeconds: Math.max(
        0,
        Math.round((expiredAt.getTime() - Date.now()) / 1000),
      ),
    };
  }
}
