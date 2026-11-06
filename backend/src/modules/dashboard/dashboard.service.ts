import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { Ride } from '../rides/entities/ride.entity';
import { TopUpRequest } from '../wallets/entities/top-up-request.entity';

export interface DashboardSummary {
  drivers: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    onlineNow: number;
  };
  rides: {
    today: number;
    searching: number;
    inProgress: number;
    completedToday: number;
    cancelledToday: number;
    noDriverFound: number;
  };
  revenue: { todayGmv: number; todayPlatformFee: number };
  topup: { pendingRequests: number; pendingAmount: number };
}

export interface DispatchRoundStat {
  round: number;
  totalOffers: number;
  accepted: number;
  ignored: number;
  expired: number;
  acceptanceRatePercent: number;
}

function startOfDayUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    @InjectRepository(Ride) private readonly rideRepo: Repository<Ride>,
    @InjectRepository(TopUpRequest)
    private readonly topupRepo: Repository<TopUpRequest>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // API.md mục 11 (#63) — GET /admin/dashboard/summary.
  async getSummary(): Promise<DashboardSummary> {
    const todayStart = startOfDayUtc(new Date());

    const [
      totalDrivers,
      approvedDrivers,
      pendingDrivers,
      rejectedDrivers,
      onlineNow,
      ridesToday,
      searching,
      inProgress,
      completedToday,
      cancelledToday,
      noDriverFound,
      todayRevenueRow,
      pendingTopupRow,
    ] = await Promise.all([
      this.driverProfileRepo.count(),
      this.driverProfileRepo.count({ where: { approvalStatus: 'APPROVED' } }),
      this.driverProfileRepo.count({ where: { approvalStatus: 'PENDING' } }),
      this.driverProfileRepo.count({ where: { approvalStatus: 'REJECTED' } }),
      this.driverProfileRepo.count({ where: { isOnline: true } }),
      this.rideRepo
        .createQueryBuilder('ride')
        .where('ride.createdAt >= :todayStart', { todayStart })
        .getCount(),
      this.rideRepo.count({ where: { status: 'SEARCHING' } }),
      this.rideRepo.count({ where: { status: 'IN_PROGRESS' } }),
      this.rideRepo
        .createQueryBuilder('ride')
        .where('ride.status = :status', { status: 'COMPLETED' })
        .andWhere('ride.completedAt >= :todayStart', { todayStart })
        .getCount(),
      this.rideRepo
        .createQueryBuilder('ride')
        .where('ride.status = :status', { status: 'CANCELLED' })
        .andWhere('ride.cancelledAt >= :todayStart', { todayStart })
        .getCount(),
      this.rideRepo.count({ where: { status: 'NO_DRIVER_FOUND' } }),
      this.rideRepo
        .createQueryBuilder('ride')
        .select('SUM(ride.finalFare)', 'gmv')
        .addSelect('SUM(ride.platformFee)', 'platformFee')
        .where('ride.status = :status', { status: 'COMPLETED' })
        .andWhere('ride.completedAt >= :todayStart', { todayStart })
        .getRawOne<{ gmv: string | null; platformFee: string | null }>(),
      this.topupRepo
        .createQueryBuilder('topup')
        .select('COUNT(*)', 'count')
        .addSelect('SUM(topup.amount)', 'amount')
        .where('topup.status = :status', { status: 'PENDING' })
        .getRawOne<{ count: string; amount: string | null }>(),
    ]);

    return {
      drivers: {
        total: totalDrivers,
        approved: approvedDrivers,
        pending: pendingDrivers,
        rejected: rejectedDrivers,
        onlineNow,
      },
      rides: {
        today: ridesToday,
        searching,
        inProgress,
        completedToday,
        cancelledToday,
        noDriverFound,
      },
      revenue: {
        todayGmv: Number(todayRevenueRow?.gmv ?? 0),
        todayPlatformFee: Number(todayRevenueRow?.platformFee ?? 0),
      },
      topup: {
        pendingRequests: Number(pendingTopupRow?.count ?? 0),
        pendingAmount: Number(pendingTopupRow?.amount ?? 0),
      },
    };
  }

  // API.md mục 11 (#64) — GET /admin/dashboard/dispatch-stats.
  // DATABASE.md mục 8.3 — hiệu quả điều phối theo từng vòng.
  async getDispatchStats(): Promise<DispatchRoundStat[]> {
    const rows: {
      round: number;
      totalOffers: string;
      accepted: string;
      ignored: string;
      expired: string;
      acceptanceRatePercent: string | null;
    }[] = await this.dataSource.query(
      `SELECT [round],
              COUNT(*)                                                   AS totalOffers,
              SUM(CASE WHEN [status] = 'ACCEPTED' THEN 1 ELSE 0 END)     AS accepted,
              SUM(CASE WHEN [status] = 'IGNORED'  THEN 1 ELSE 0 END)     AS ignored,
              SUM(CASE WHEN [status] = 'EXPIRED'  THEN 1 ELSE 0 END)     AS expired,
              CAST(100.0 * SUM(CASE WHEN [status]='ACCEPTED' THEN 1 ELSE 0 END)
                   / NULLIF(COUNT(*),0) AS decimal(5,2))                 AS acceptanceRatePercent
       FROM   RideOffer
       GROUP BY [round]
       ORDER BY [round];`,
    );

    return rows.map((row) => ({
      round: row.round,
      totalOffers: Number(row.totalOffers),
      accepted: Number(row.accepted),
      ignored: Number(row.ignored),
      expired: Number(row.expired),
      acceptanceRatePercent: Number(row.acceptanceRatePercent ?? 0),
    }));
  }
}
