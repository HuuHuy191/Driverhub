import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverProfile } from './entities/driver-profile.entity';
import { DriverDocument } from './entities/driver-document.entity';
import { User } from '../users/entities/user.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Ride } from '../rides/entities/ride.entity';
import { RideOffer } from '../rides/entities/ride-offer.entity';
import { SettingsModule } from '../settings/settings.module';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { UploadsModule } from '../uploads/uploads.module';
import { DriversController } from './drivers.controller';
import { DriversMeController } from './drivers-me.controller';
import { DriversService } from './drivers.service';
import { DriverStatusService } from './driver-status.service';
import { DriverStatsService } from './driver-stats.service';
import { DriverDocumentsService } from './driver-documents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DriverProfile,
      DriverDocument,
      User,
      Vehicle,
      Wallet,
      Notification,
      RefreshToken,
      Ride,
      RideOffer,
    ]),
    SettingsModule,
    // ApprovedDriverGuard (🚗) dùng ở DriversMeController — AuthModule export sẵn.
    AuthModule,
    RealtimeModule,
    UploadsModule,
  ],
  controllers: [DriversController, DriversMeController],
  providers: [
    DriversService,
    DriverStatusService,
    DriverStatsService,
    DriverDocumentsService,
  ],
})
export class DriversModule {}
