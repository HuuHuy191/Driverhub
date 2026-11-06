import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ride } from './entities/ride.entity';
import { RideOffer } from './entities/ride-offer.entity';
import { RideStatusHistory } from './entities/ride-status-history.entity';
import { Customer } from '../customers/entities/customer.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { SettingsModule } from '../settings/settings.module';
import { AuthModule } from '../auth/auth.module';
import { WalletsModule } from '../wallets/wallets.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RidesController } from './rides.controller';
import { RidesDriverController } from './rides-driver.controller';
import { RidesService } from './rides.service';
import { RideOffersService } from './ride-offers.service';
import { RideStatusService } from './ride-status.service';
import { RideCancelService } from './ride-cancel.service';
import { FareCalculatorService } from './fare-calculator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ride,
      RideOffer,
      RideStatusHistory,
      Customer,
      DriverProfile,
      Vehicle,
      Wallet,
    ]),
    SettingsModule,
    // ApprovedDriverGuard (🚗) dùng ở RidesDriverController — AuthModule export sẵn.
    AuthModule,
    // RideStatusService.completeRide() dùng WalletService.applyTransaction() (BR-56).
    WalletsModule,
    RealtimeModule,
    DispatchModule,
    NotificationsModule,
  ],
  controllers: [RidesController, RidesDriverController],
  providers: [
    RidesService,
    RideOffersService,
    RideStatusService,
    RideCancelService,
    FareCalculatorService,
  ],
})
export class RidesModule {}
