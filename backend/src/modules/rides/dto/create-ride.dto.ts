import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import type {
  RidePaymentMethod,
  RideVehicleType,
} from '../entities/ride.entity';

const VEHICLE_TYPES: RideVehicleType[] = ['MOTORBIKE', 'CAR'];
const PAYMENT_METHODS: RidePaymentMethod[] = ['CASH', 'WALLET'];

// API.md mục 7.2 — POST /admin/rides. estimatedFare để trống (null/undefined)
// => RidesService tự tính theo BR-36; nếu Admin nhập tay thì RidesService
// kiểm tra khoảng 10.000đ–5.000.000đ (BR-37), KHÔNG kiểm tra ở đây để giữ
// đúng errorCode nghiệp vụ FARE_OUT_OF_RANGE thay vì lỗi validate chung.
export class CreateRideDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ enum: VEHICLE_TYPES })
  @IsIn(VEHICLE_TYPES)
  vehicleType: RideVehicleType;

  @ApiProperty({ example: 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội' })
  @IsString()
  @MaxLength(500)
  pickupAddress: string;

  @ApiProperty({ example: 21.0067 })
  @IsLatitude()
  pickupLatitude: number;

  @ApiProperty({ example: 105.8431 })
  @IsLongitude()
  pickupLongitude: number;

  @ApiProperty({ example: 'Số 144 Xuân Thủy, Cầu Giấy, Hà Nội' })
  @IsString()
  @MaxLength(500)
  dropoffAddress: string;

  @ApiProperty({ example: 21.0367 })
  @IsLatitude()
  dropoffLatitude: number;

  @ApiProperty({ example: 105.7826 })
  @IsLongitude()
  dropoffLongitude: number;

  @ApiProperty({ example: 7.5 })
  @IsNumber()
  @IsPositive()
  distanceKm: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({
    example: null,
    description: 'null => hệ thống tự tính theo BR-36',
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  estimatedFare?: number | null;

  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  paymentMethod: RidePaymentMethod;
}
