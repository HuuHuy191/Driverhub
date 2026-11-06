import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ride } from '../rides/entities/ride.entity';
import { RideOffer } from '../rides/entities/ride-offer.entity';
import { RideStatusHistory } from '../rides/entities/ride-status-history.entity';
import { SettingsModule } from '../settings/settings.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { DriverMatcherService } from './driver-matcher.service';
import { DispatchService } from './dispatch.service';
import { OfferExpiryJob } from './jobs/offer-expiry.job';

// Module lá giống RealtimeModule: chỉ cần entity trực tiếp (không import
// DriversModule/RidesModule) để RidesModule import ngược lại mà không vòng.
// DriverMatcherService không cần @InjectRepository — dùng dataSource.query()
// thô cho câu SQL geography::Point ở DATABASE.md mục 6, nên Vehicle/Wallet/
// DriverProfile không cần khai báo forFeature() ở đây.
@Module({
  imports: [
    TypeOrmModule.forFeature([Ride, RideOffer, RideStatusHistory]),
    SettingsModule,
    RealtimeModule,
  ],
  providers: [DriverMatcherService, DispatchService, OfferExpiryJob],
  exports: [DispatchService],
})
export class DispatchModule {}
