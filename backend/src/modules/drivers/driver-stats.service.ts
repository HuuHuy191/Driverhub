import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DriverProfile } from './entities/driver-profile.entity';
import { Ride } from '../rides/entities/ride.entity';
import { RideOffer } from '../rides/entities/ride-offer.entity';
import { ListDriverStatsDto } from './dto/list-driver-stats.dto';

const DEFAULT_RANGE_DAYS = 30;

export interface DriverStatsBreakdownRow {
  date: string;
  rides: number;
  fare: number;
  platformFee: number;
  netEarning: number;
}

export interface DriverStatsView {
  summary: {
    totalRides: number;
    totalFare: number;
    totalPlatformFee: number;
    netEarning: number;
    cancelCount: number;
    acceptanceRate: number;
  };
  breakdown: DriverStatsBreakdownRow[];
}

function startOfDayUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfDayUtc(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

// API.md mục 3.2 — GET /drivers/me/stats. BR-60: mọi số tiền đọc từ cột
// snapshot của Ride (finalFare/platformFee/driverEarning), KHÔNG tính lại từ
// SystemConfig — nếu COMMISSION_RATE đổi giữa chừng, thống kê các ngày cũ
// vẫn phải đúng theo tỷ lệ đã áp dụng lúc đó.
@Injectable()
export class DriverStatsService {
  constructor(
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    @InjectRepository(Ride) private readonly rideRepo: Repository<Ride>,
    @InjectRepository(RideOffer)
    private readonly rideOfferRepo: Repository<RideOffer>,
  ) {}

  async getStats(
    userId: string,
    query: ListDriverStatsDto,
  ): Promise<DriverStatsView> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }

    const to = query.to
      ? endOfDayUtc(new Date(query.to))
      : endOfDayUtc(new Date());
    const from = query.from
      ? startOfDayUtc(new Date(query.from))
      : startOfDayUtc(
          new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000),
        );

    // Chỉ đọc cột snapshot — không JOIN SystemConfig, không tính lại phí.
    const completedRides = await this.rideRepo.find({
      where: {
        driverId: driver.id,
        status: 'COMPLETED',
        completedAt: Between(from, to),
      },
      select: ['completedAt', 'finalFare', 'platformFee', 'driverEarning'],
    });

    const cancelCount = await this.rideRepo.count({
      where: {
        driverId: driver.id,
        status: 'CANCELLED',
        cancelledBy: 'DRIVER',
        cancelledAt: Between(from, to),
      },
    });

    // DATABASE.md mục 8.3 — công thức tỷ lệ nhận, thu hẹp về đúng một tài xế
    // và đúng khoảng thời gian đang xét (thay vì gộp theo round toàn hệ thống).
    const offerStats = await this.rideOfferRepo
      .createQueryBuilder('offer')
      .select('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN offer.status = 'ACCEPTED' THEN 1 ELSE 0 END)`,
        'accepted',
      )
      .where('offer.driverId = :driverId', { driverId: driver.id })
      .andWhere('offer.offeredAt BETWEEN :from AND :to', { from, to })
      .getRawOne<{ total: string; accepted: string }>();
    const totalOffers = Number(offerStats?.total ?? 0);
    const acceptedOffers = Number(offerStats?.accepted ?? 0);
    const acceptanceRate =
      totalOffers > 0
        ? Math.round((acceptedOffers / totalOffers) * 100) / 100
        : 0;

    const buckets = new Map<string, DriverStatsBreakdownRow>();
    let totalFare = 0;
    let totalPlatformFee = 0;
    let netEarning = 0;

    for (const ride of completedRides) {
      const fare = Number(ride.finalFare ?? 0);
      const fee = Number(ride.platformFee ?? 0);
      const earning = Number(ride.driverEarning ?? 0);
      totalFare += fare;
      totalPlatformFee += fee;
      netEarning += earning;

      const dateKey = (ride.completedAt as Date).toISOString().slice(0, 10);
      const bucket = buckets.get(dateKey) ?? {
        date: dateKey,
        rides: 0,
        fare: 0,
        platformFee: 0,
        netEarning: 0,
      };
      bucket.rides += 1;
      bucket.fare += fare;
      bucket.platformFee += fee;
      bucket.netEarning += earning;
      buckets.set(dateKey, bucket);
    }

    const breakdown = Array.from(buckets.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return {
      summary: {
        totalRides: completedRides.length,
        totalFare,
        totalPlatformFee,
        netEarning,
        cancelCount,
        acceptanceRate,
      },
      breakdown,
    };
  }
}
