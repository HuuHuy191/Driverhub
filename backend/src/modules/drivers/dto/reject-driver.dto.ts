import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// BR-18: lý do từ chối bắt buộc, tối thiểu 10 ký tự. Cố tình để optional ở
// DTO — thiếu hoặc quá ngắn đều phải ném cùng một errorCode
// REJECT_REASON_REQUIRED (do DriversService kiểm tra), không phải lỗi
// validate chung chung của ValidationPipe.
export class RejectDriverDto {
  @ApiPropertyOptional({
    description: 'Lý do từ chối, tối thiểu 10 ký tự (BR-18)',
    example: 'Ảnh giấy phép lái xe bị mờ, không đọc được số hiệu',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
