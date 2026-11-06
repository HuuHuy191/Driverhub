import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { VehicleType } from '../entities/vehicle.entity';

const VEHICLE_TYPES: VehicleType[] = ['MOTORBIKE', 'CAR'];

// API.md mục 5 (#27) — POST /vehicles.
export class CreateVehicleDto {
  @ApiProperty({ enum: VEHICLE_TYPES, example: 'MOTORBIKE' })
  @IsIn(VEHICLE_TYPES)
  vehicleType: VehicleType;

  @ApiProperty({ example: 'Honda' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand: string;

  @ApiProperty({ example: 'Vision' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  modelName: string;

  // BR-22: biển số xe là duy nhất trên toàn hệ thống — kiểm tra ở service.
  @ApiProperty({ example: '29X1-12345' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  licensePlate: string;

  @ApiPropertyOptional({ example: 'Đen' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;
}
