import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RideVehicleType } from '../rides/entities/ride.entity';
import { SettingsService } from '../settings/settings.service';

export interface EligibleDriver {
  id: string;
  fullName: string;
  phoneNumber: string;
  distanceKm: number;
}

@Injectable()
export class DriverMatcherService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
  ) {}

  // DATABASE.md mục 6 / BR-40 / BR-41 — lọc thô bằng hộp bao (bounding box)
  // TRƯỚC để tận dụng chỉ mục, rồi mới tính STDistance() chính xác. Raw query
  // tham số hóa bằng placeholder @0, @1, ... (driver mssql của TypeORM),
  // KHÔNG bao giờ nối chuỗi giá trị vào SQL.
  async findEligibleDrivers(
    rideId: string,
    pickupLat: number,
    pickupLng: number,
    vehicleType: RideVehicleType,
    batchSize: number,
  ): Promise<EligibleDriver[]> {
    const radiusKm = this.settingsService.getNumber('DISPATCH_RADIUS_KM');
    const staleMinutes = this.settingsService.getNumber(
      'LOCATION_STALE_MINUTES',
    );
    const maxNegativeBalance = this.settingsService.getNumber(
      'MAX_NEGATIVE_BALANCE',
    );
    const latDelta = radiusKm / 111.0;
    const lngDelta = radiusKm / (111.0 * Math.cos((pickupLat * Math.PI) / 180));

    const rows: {
      id: string;
      fullName: string;
      phoneNumber: string;
      distanceKm: number;
    }[] = await this.dataSource.query(
      `SELECT TOP (@0)
              dp.id, dp.fullName, dp.phoneNumber,
              geography::Point(dp.currentLatitude, dp.currentLongitude, 4326)
                .STDistance(geography::Point(@1, @2, 4326)) / 1000.0 AS distanceKm
       FROM   DriverProfile dp
       JOIN   [User]  u ON u.id = dp.userId
       JOIN   Vehicle v ON v.driverId = dp.id
                       AND v.isActive = 1
                       AND v.verificationStatus = 'APPROVED'
                       AND v.vehicleType = @3
       JOIN   Wallet  w ON w.userId = u.id
       WHERE  dp.isOnline = 1
         AND  dp.approvalStatus = 'APPROVED'
         AND  u.[status] = 'ACTIVE'
         AND  dp.lastLocationUpdatedAt >= DATEADD(MINUTE, -@4, SYSUTCDATETIME())
         AND  w.balance >= @5
         AND  dp.currentLatitude  BETWEEN @6 AND @7
         AND  dp.currentLongitude BETWEEN @8 AND @9
         AND  NOT EXISTS (SELECT 1 FROM Ride r
                          WHERE r.driverId = dp.id
                            AND r.[status] IN ('ACCEPTED','ARRIVED','IN_PROGRESS'))
         AND  NOT EXISTS (SELECT 1 FROM RideOffer o
                          WHERE o.rideId = @10 AND o.driverId = dp.id)
         AND  geography::Point(dp.currentLatitude, dp.currentLongitude, 4326)
                .STDistance(geography::Point(@1, @2, 4326)) <= @11 * 1000
       ORDER BY distanceKm ASC;`,
      [
        batchSize,
        pickupLat,
        pickupLng,
        vehicleType,
        staleMinutes,
        maxNegativeBalance,
        pickupLat - latDelta,
        pickupLat + latDelta,
        pickupLng - lngDelta,
        pickupLng + lngDelta,
        rideId,
        radiusKm,
      ],
    );

    return rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      phoneNumber: row.phoneNumber,
      distanceKm: Number(row.distanceKm),
    }));
  }
}
