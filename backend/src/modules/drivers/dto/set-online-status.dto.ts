import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
} from 'class-validator';

// API.md mục 3.1 — PATCH /drivers/me/status. latitude/longitude bắt buộc khi
// isOnline=true (BR-26 điều kiện 5) — kiểm tra ở service để trả đúng
// errorCode LOCATION_REQUIRED thay vì lỗi validate chung chung, nên để
// @IsOptional() ở đây thay vì @IsNotEmpty() có điều kiện.
export class SetOnlineStatusDto {
  @IsBoolean()
  isOnline: boolean;

  @ApiPropertyOptional({
    example: 21.0285,
    description: 'Bắt buộc khi isOnline=true (BR-26)',
  })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({
    example: 105.8542,
    description: 'Bắt buộc khi isOnline=true (BR-26)',
  })
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
