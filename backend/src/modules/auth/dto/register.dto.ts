import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { VehicleType } from '../../vehicles/entities/vehicle.entity';

// BR-06: mật khẩu tối thiểu 8 ký tự, có ít nhất một chữ cái và một chữ số.
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PHONE_REGEX = /^0\d{9}$/;
const VEHICLE_TYPES: VehicleType[] = ['MOTORBIKE', 'CAR'];

// API.md mục 2.1 — đăng ký nhận JSON, thông tin định danh được Admin duyệt thủ công.
export class RegisterDto {
  @ApiProperty({ example: 'taixe01@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'MatKhau123' })
  @Matches(PASSWORD_REGEX, {
    message: 'Mật khẩu tối thiểu 8 ký tự, có ít nhất một chữ cái và một chữ số',
  })
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn An' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  // BR-05: số điện thoại là duy nhất trên toàn hệ thống — kiểm tra ở service.
  @ApiProperty({ example: '0912345678' })
  @Matches(PHONE_REGEX, { message: 'Số điện thoại không hợp lệ' })
  phoneNumber: string;

  @ApiProperty({ example: '1995-04-12' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: '012345678901' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  citizenIdNumber: string;

  @ApiProperty({ example: '2021-06-15' })
  @IsDateString()
  citizenIdIssueDate: string;

  @ApiProperty({ example: '790123456789' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  driverLicenseNumber: string;

  @ApiProperty({ example: '2022-01-20' })
  @IsDateString()
  driverLicenseIssueDate: string;

  @ApiPropertyOptional({ example: 'Số 10, Cầu Giấy, Hà Nội' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  temporaryAddress?: string;

  @ApiProperty({ enum: VEHICLE_TYPES, example: 'MOTORBIKE' })
  @IsIn(VEHICLE_TYPES)
  vehicleType: VehicleType;

  @ApiProperty({ example: 'Honda' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  vehicleBrand: string;

  @ApiProperty({ example: 'Vision' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  vehicleModelName: string;

  // BR-22: biển số xe là duy nhất trên toàn hệ thống — kiểm tra ở service.
  @ApiProperty({ example: '29X1-12345' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  vehicleLicensePlate: string;

  @ApiPropertyOptional({ example: 'Đen' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vehicleColor?: string;
}
