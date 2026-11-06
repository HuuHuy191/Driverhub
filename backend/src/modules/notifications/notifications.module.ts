import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { FcmService } from './fcm.service';

// Module lá (như RealtimeModule/DispatchModule): chỉ cần DriverProfile trực
// tiếp để suy ra room Socket, không import DriversModule/RidesModule/
// WalletsModule — các module đó import ngược lại NotificationsModule.
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, DriverProfile]),
    RealtimeModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, FcmService],
  exports: [NotificationsService, FcmService],
})
export class NotificationsModule {}
