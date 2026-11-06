import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, Not, Repository } from 'typeorm';
import { Ride } from './entities/ride.entity';
import { RideOffer } from './entities/ride-offer.entity';
import { RideStatusHistory } from './entities/ride-status-history.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { SettingsService } from '../settings/settings.service';
import { RealtimeService } from '../realtime/realtime.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';

// BR-40 điều kiện 5 — trạng thái coi là tài xế "đang bận".
const ACTIVE_RIDE_STATUSES = ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] as const;

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Ước lượng khoảng cách đường chim bay — chỉ dùng để hiển thị cho tài xế
// tham khảo ở GET /rides/offers (khác với truy vấn geography::Point dùng để
// XÉT điều kiện điều phối ở BR-41, việc đó thuộc DispatchService chặng 13).
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export interface RideOfferView {
  offerId: string;
  rideId: string;
  rideCode: string;
  customerName: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  distanceKm: number;
  distanceToPickupKm: number | null;
  estimatedFare: number;
  estimatedEarning: number;
  paymentMethod: string;
  expiredAt: Date;
  remainingSeconds: number;
}

export interface AcceptRideResult {
  id: string;
  rideCode: string;
  status: Ride['status'];
  acceptedAt: Date;
  customer: { fullName: string; phoneNumber: string };
  vehicle: { licensePlate: string; brand: string; modelName: string };
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  estimatedEarning: number;
}

@Injectable()
export class RideOffersService {
  constructor(
    @InjectRepository(Ride) private readonly rideRepo: Repository<Ride>,
    @InjectRepository(RideOffer)
    private readonly rideOfferRepo: Repository<RideOffer>,
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  // API.md mục 7.3 — GET /rides/offers. Chỉ trả lời mời còn hiệu lực.
  async findActiveOffers(userId: string): Promise<RideOfferView[]> {
    const driver = await this.resolveDriverProfile(userId);
    const commissionRate = this.settingsService.getNumber('COMMISSION_RATE');

    const offers = await this.rideOfferRepo.find({
      where: {
        driverId: driver.id,
        status: In(['SENT', 'VIEWED']),
        expiredAt: MoreThan(new Date()),
      },
      relations: ['ride', 'ride.customer'],
      order: { expiredAt: 'ASC' },
    });

    const now = Date.now();
    return offers.map((offer) => {
      const ride = offer.ride;
      const estimatedFare = Number(ride.estimatedFare);
      return {
        offerId: offer.id,
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
        distanceToPickupKm: this.distanceToPickupKm(driver, ride),
        estimatedFare,
        estimatedEarning: this.estimateEarning(estimatedFare, commissionRate),
        paymentMethod: ride.paymentMethod,
        expiredAt: offer.expiredAt,
        remainingSeconds: Math.max(
          0,
          Math.round((offer.expiredAt.getTime() - now) / 1000),
        ),
      };
    });
  }

  // API.md mục 7.3 (sự kiện offer:viewed) — đánh dấu tài xế đã mở xem chi
  // tiết lời mời. Idempotent: chỉ ghi viewedAt lần đầu (status SENT -> VIEWED).
  async markViewed(
    rideId: string,
    userId: string,
  ): Promise<{ offerId: string; rideId: string; status: 'VIEWED' }> {
    const driver = await this.resolveDriverProfile(userId);
    const offer = await this.findActiveOfferOrFail(rideId, driver.id);

    if (offer.status === 'SENT') {
      await this.rideOfferRepo.update(offer.id, {
        status: 'VIEWED',
        viewedAt: () => 'SYSUTCDATETIME()',
      });
    }

    return { offerId: offer.id, rideId, status: 'VIEWED' };
  }

  // Tài xế chủ động bỏ qua lời mời.
  async ignore(
    rideId: string,
    userId: string,
  ): Promise<{ offerId: string; rideId: string; status: 'IGNORED' }> {
    const driver = await this.resolveDriverProfile(userId);
    const offer = await this.findActiveOfferOrFail(rideId, driver.id);

    await this.rideOfferRepo.update(offer.id, {
      status: 'IGNORED',
      respondedAt: () => 'SYSUTCDATETIME()',
    });

    return { offerId: offer.id, rideId, status: 'IGNORED' };
  }

  // API.md mục 7.4 — POST /rides/:id/accept. Endpoint quan trọng nhất: phân
  // xử tranh chấp đồng thời theo đúng BR-45 (optimistic concurrency bằng
  // UPDATE có điều kiện trong WHERE, KHÔNG SELECT rồi UPDATE).
  async accept(rideId: string, userId: string): Promise<AcceptRideResult> {
    const driver = await this.resolveDriverProfile(userId);

    // Bước 1 (API.md mục 7.4): offer tồn tại, thuộc tài xế này, còn hiệu lực.
    const offer = await this.findActiveOfferOrFail(rideId, driver.id);

    // Bước 2 — BR-47: tái kiểm tra BR-40 điều kiện 5 (không đang có chuyến dở
    // dang) và điều kiện 7 (ví không âm quá ngưỡng). Lời mời có thể đã gửi
    // từ trước, tình trạng tài xế có thể đã đổi từ lúc đó.
    const activeRideCount = await this.rideRepo.count({
      where: { driverId: driver.id, status: In([...ACTIVE_RIDE_STATUSES]) },
    });
    if (activeRideCount > 0) {
      throw new BusinessException(
        'ACTIVE_RIDE_EXISTS',
        ERROR_CODES.ACTIVE_RIDE_EXISTS.httpStatus,
        ERROR_CODES.ACTIVE_RIDE_EXISTS.message,
      );
    }

    const wallet = await this.walletRepo.findOne({ where: { userId } });
    const maxNegativeBalance = this.settingsService.getNumber(
      'MAX_NEGATIVE_BALANCE',
    );
    if (!wallet || Number(wallet.balance) < maxNegativeBalance) {
      throw new BusinessException(
        'WALLET_BELOW_THRESHOLD',
        ERROR_CODES.WALLET_BELOW_THRESHOLD.httpStatus,
        ERROR_CODES.WALLET_BELOW_THRESHOLD.message,
      );
    }

    // Bước 3 — BR-46: vehicleId lấy từ xe đang hoạt động của tài xế TẠI THỜI
    // ĐIỂM nhận chuyến, tài xế không tự chọn.
    const activeVehicle = await this.vehicleRepo.findOne({
      where: {
        driverId: driver.id,
        isActive: true,
        verificationStatus: 'APPROVED',
      },
    });
    if (!activeVehicle) {
      throw new BusinessException(
        'NO_ACTIVE_VEHICLE',
        ERROR_CODES.NO_ACTIVE_VEHICLE.httpStatus,
        ERROR_CODES.NO_ACTIVE_VEHICLE.message,
      );
    }

    // Bước 4 — BR-45: QueryRunner tường minh, UPDATE có điều kiện trong WHERE.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ĐÚNG câu UPDATE của BR-45: điều kiện tranh chấp nằm trong WHERE, để
      // chính CSDL phân xử — KHÔNG đọc status ra trước rồi mới quyết định ghi.
      const updateResult = await queryRunner.manager
        .createQueryBuilder()
        .update(Ride)
        .set({
          driverId: driver.id,
          vehicleId: activeVehicle.id,
          status: 'ACCEPTED',
          acceptedAt: () => 'SYSUTCDATETIME()',
        })
        .where('id = :rideId', { rideId })
        .andWhere('status = :searching', { searching: 'SEARCHING' })
        .andWhere('driverId IS NULL')
        .execute();

      if (updateResult.affected !== 1) {
        // Thua (@@ROWCOUNT = 0): rollback transaction (câu UPDATE trên không
        // đổi dòng nào nên không có gì thật sự phải cuốn lại, nhưng vẫn đóng
        // đúng vòng đời transaction trước khi ghi tiếp ở ngoài nó).
        await queryRunner.rollbackTransaction();

        await this.rideOfferRepo
          .createQueryBuilder()
          .update(RideOffer)
          .set({ status: 'LOST', respondedAt: () => 'SYSUTCDATETIME()' })
          .where('id = :offerId', { offerId: offer.id })
          .execute();

        throw new BusinessException(
          'RIDE_ALREADY_TAKEN',
          ERROR_CODES.RIDE_ALREADY_TAKEN.httpStatus,
          ERROR_CODES.RIDE_ALREADY_TAKEN.message,
        );
      }

      // Thắng (@@ROWCOUNT = 1): offer này -> ACCEPTED; các offer khác của
      // cùng chuyến đang SENT/VIEWED -> LOST; ghi RideStatusHistory.
      await queryRunner.manager
        .createQueryBuilder()
        .update(RideOffer)
        .set({ status: 'ACCEPTED', respondedAt: () => 'SYSUTCDATETIME()' })
        .where('id = :offerId', { offerId: offer.id })
        .execute();

      // Đọc trước danh sách offer sắp bị đánh LOST — cần driverId của họ để
      // phát ride:offer_taken sau khi commit (bước 5 bên dưới).
      const losingOffers = await queryRunner.manager
        .getRepository(RideOffer)
        .find({
          where: {
            rideId,
            id: Not(offer.id),
            status: In(['SENT', 'VIEWED']),
          },
        });

      await queryRunner.manager
        .createQueryBuilder()
        .update(RideOffer)
        .set({ status: 'LOST', respondedAt: () => 'SYSUTCDATETIME()' })
        .where('rideId = :rideId', { rideId })
        .andWhere('id <> :offerId', { offerId: offer.id })
        .andWhere('status IN (:...statuses)', { statuses: ['SENT', 'VIEWED'] })
        .execute();

      await queryRunner.manager.getRepository(RideStatusHistory).save({
        rideId,
        fromStatus: 'SEARCHING',
        toStatus: 'ACCEPTED',
        changedByType: 'DRIVER',
        changedById: userId,
        note: null,
      });

      // Đọc lại SAU KHI đã thắng, chỉ để dựng dữ liệu trả về cho client —
      // không phải một phần của phân xử tranh chấp (đã xong ở câu UPDATE trên).
      const acceptedRide = await queryRunner.manager
        .getRepository(Ride)
        .findOne({
          where: { id: rideId },
          relations: ['customer', 'vehicle'],
        });
      if (!acceptedRide || !acceptedRide.vehicle || !acceptedRide.acceptedAt) {
        throw new Error(
          'Ride vừa được cập nhật nhưng không đọc lại được đầy đủ dữ liệu.',
        );
      }

      await queryRunner.commitTransaction();

      // Bước 5 (API.md mục 7.4): phát sự kiện Socket SAU KHI COMMIT.
      const estimatedFare = Number(acceptedRide.estimatedFare);
      const commissionRate = this.settingsService.getNumber('COMMISSION_RATE');
      const estimatedEarning = this.estimateEarning(estimatedFare, commissionRate);

      this.realtimeService.emitRideAssigned(driver.id, {
        id: acceptedRide.id,
        rideCode: acceptedRide.rideCode,
        status: acceptedRide.status,
        acceptedAt: acceptedRide.acceptedAt,
        customer: {
          fullName: acceptedRide.customer.fullName,
          phoneNumber: acceptedRide.customer.phoneNumber,
        },
        vehicle: {
          licensePlate: acceptedRide.vehicle.licensePlate,
          brand: acceptedRide.vehicle.brand,
          modelName: acceptedRide.vehicle.modelName,
        },
        pickupAddress: acceptedRide.pickupAddress,
        dropoffAddress: acceptedRide.dropoffAddress,
        estimatedFare,
        estimatedEarning,
      });
      for (const losingOffer of losingOffers) {
        this.realtimeService.emitOfferTaken(losingOffer.driverId, {
          offerId: losingOffer.id,
          rideId,
        });
      }
      this.realtimeService.emitRideStatusChanged({
        rideId: acceptedRide.id,
        rideCode: acceptedRide.rideCode,
        fromStatus: 'SEARCHING',
        toStatus: 'ACCEPTED',
        driverId: driver.id,
        driverName: driver.fullName,
        at: acceptedRide.acceptedAt,
      });

      return {
        id: acceptedRide.id,
        rideCode: acceptedRide.rideCode,
        status: acceptedRide.status,
        acceptedAt: acceptedRide.acceptedAt,
        customer: {
          fullName: acceptedRide.customer.fullName,
          phoneNumber: acceptedRide.customer.phoneNumber,
        },
        vehicle: {
          licensePlate: acceptedRide.vehicle.licensePlate,
          brand: acceptedRide.vehicle.brand,
          modelName: acceptedRide.vehicle.modelName,
        },
        pickupAddress: acceptedRide.pickupAddress,
        dropoffAddress: acceptedRide.dropoffAddress,
        estimatedFare,
        estimatedEarning,
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

  // Bước 1 (API.md mục 7.4): offer tồn tại, thuộc tài xế này,
  // status IN ('SENT','VIEWED'), expiredAt > NOW. Dùng chung cho
  // view/ignore/accept.
  private async findActiveOfferOrFail(
    rideId: string,
    driverId: string,
  ): Promise<RideOffer> {
    const offer = await this.rideOfferRepo.findOne({
      where: {
        rideId,
        driverId,
        status: In(['SENT', 'VIEWED']),
        expiredAt: MoreThan(new Date()),
      },
    });
    if (!offer) {
      throw new BusinessException(
        'OFFER_EXPIRED',
        ERROR_CODES.OFFER_EXPIRED.httpStatus,
        ERROR_CODES.OFFER_EXPIRED.message,
      );
    }
    return offer;
  }

  private async resolveDriverProfile(userId: string): Promise<DriverProfile> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }
    return driver;
  }

  private distanceToPickupKm(driver: DriverProfile, ride: Ride): number | null {
    if (driver.currentLatitude === null || driver.currentLongitude === null) {
      return null;
    }
    return haversineKm(
      Number(driver.currentLatitude),
      Number(driver.currentLongitude),
      Number(ride.pickupLatitude),
      Number(ride.pickupLongitude),
    );
  }

  // BR-59: platformFee = ROUND(fare * commissionRate, 0); earning = fare - platformFee.
  private estimateEarning(
    estimatedFare: number,
    commissionRate: number,
  ): number {
    const platformFee = Math.round(estimatedFare * commissionRate);
    return estimatedFare - platformFee;
  }
}
