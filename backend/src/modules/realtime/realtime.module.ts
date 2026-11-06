import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { RideOffer } from '../rides/entities/ride-offer.entity';
import { AuthModule } from '../auth/auth.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';

// Module lá: chỉ phụ thuộc AuthModule (TokenService) + 2 entity cần cho
// handleConnection()/handleDriverLocation()/handleOfferViewed(). KHÔNG import
// DriversModule/RidesModule/DispatchModule để các module đó có thể import
// ngược lại RealtimeModule (lấy RealtimeService) mà không tạo phụ thuộc vòng.
@Module({
  imports: [
    TypeOrmModule.forFeature([DriverProfile, RideOffer]),
    AuthModule,
  ],
  providers: [RealtimeGateway, RealtimeService, WsJwtGuard],
  exports: [RealtimeService],
})
export class RealtimeModule {}
