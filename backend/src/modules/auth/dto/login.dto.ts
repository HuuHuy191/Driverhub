import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'taixe01@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MatKhau123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: 'android-a1b2c3', description: 'Dùng cho mobile' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ example: 'dXNlcl90b2tlbi...', description: 'Để nhận thông báo đẩy' })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}
