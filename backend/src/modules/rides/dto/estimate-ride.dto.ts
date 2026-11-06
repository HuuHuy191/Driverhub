import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsPositive } from 'class-validator';
import type { RideVehicleType } from '../entities/ride.entity';

const VEHICLE_TYPES: RideVehicleType[] = ['MOTORBIKE', 'CAR'];

// API.md mục 7.1 — POST /admin/rides/estimate
export class EstimateRideDto {
  @ApiProperty({ enum: VEHICLE_TYPES })
  @IsIn(VEHICLE_TYPES)
  vehicleType: RideVehicleType;

  @ApiProperty({ example: 7.5 })
  @IsNumber()
  @IsPositive()
  distanceKm: number;
}
