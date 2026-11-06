import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { AuthModule } from '../auth/auth.module';
import { VehiclesController } from './vehicles.controller';
import { AdminVehiclesController } from './admin-vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, DriverProfile]),
    // ApprovedDriverGuard (🚗) dùng ở VehiclesController#activate.
    AuthModule,
  ],
  controllers: [VehiclesController, AdminVehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
