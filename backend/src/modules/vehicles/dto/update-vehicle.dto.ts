import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// API.md mục 5 (#28) — PATCH /vehicles/:id. vehicleType không cho sửa (cố
// định từ lúc thêm xe) để tránh phá vỡ giả định BR-25 (chuyến khớp loại xe).
export class UpdateVehicleDto {
  @ApiPropertyOptional({ example: 'Honda' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: 'Vision' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelName?: string;

  // BR-22: biển số xe là duy nhất trên toàn hệ thống — kiểm tra ở service.
  @ApiPropertyOptional({ example: '29X1-12345' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  licensePlate?: string;

  @ApiPropertyOptional({ example: 'Đen' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;
}
