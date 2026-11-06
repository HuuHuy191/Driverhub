import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { VehicleVerificationStatus } from '../entities/vehicle.entity';

const DECISIONS: VehicleVerificationStatus[] = ['APPROVED', 'REJECTED'];

// API.md mục 5 (#30) — PATCH /admin/vehicles/:id/verify. Từ chối bắt buộc có
// lý do (theo cùng khuôn mẫu BR-18 áp dụng cho hồ sơ tài xế) — cố tình để
// optional ở DTO, thiếu/ngắn ném REJECT_REASON_REQUIRED ở service thay vì
// lỗi validate chung chung.
export class VerifyVehicleDto {
  @ApiProperty({ enum: DECISIONS })
  @IsIn(DECISIONS)
  verificationStatus: VehicleVerificationStatus;

  @ApiPropertyOptional({ example: 'Ảnh đăng ký xe bị mờ, không đọc được biển số' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
