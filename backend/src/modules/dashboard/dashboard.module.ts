import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { Ride } from '../rides/entities/ride.entity';
import { TopUpRequest } from '../wallets/entities/top-up-request.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([DriverProfile, Ride, TopUpRequest])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
