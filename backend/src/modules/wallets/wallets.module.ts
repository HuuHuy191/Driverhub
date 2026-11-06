import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { TopUpRequest } from './entities/top-up-request.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Ride } from '../rides/entities/ride.entity';
import { SettingsModule } from '../settings/settings.module';
import { AuthModule } from '../auth/auth.module';
import { UploadsModule } from '../uploads/uploads.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { WalletController } from './wallet.controller';
import { AdminTopupController } from './admin-topup.controller';
import { AdminWalletController } from './admin-wallet.controller';
import { WalletService } from './wallet.service';
import { TopupService } from './topup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      WalletTransaction,
      TopUpRequest,
      DriverProfile,
      Notification,
      Ride,
    ]),
    SettingsModule,
    // ApprovedDriverGuard (🚗) dùng ở WalletController — AuthModule export sẵn.
    AuthModule,
    UploadsModule,
    RealtimeModule,
  ],
  controllers: [WalletController, AdminTopupController, AdminWalletController],
  providers: [WalletService, TopupService],
  // RidesModule (quyết toán BR-63) dùng WalletService.applyTransaction() —
  // BR-56: mọi thay đổi số dư PHẢI đi qua đây, không tự UPDATE Wallet ở nơi khác.
  exports: [WalletService],
})
export class WalletsModule {}
