import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// BR-50: lý do hủy bắt buộc, tối thiểu 5 ký tự. Cố tình để optional ở DTO —
// thiếu hoặc quá ngắn đều phải ném cùng một errorCode CANCEL_REASON_REQUIRED
// (do RideCancelService kiểm tra), không phải lỗi validate chung chung của
// ValidationPipe, đúng khuôn mẫu RejectDriverDto (BR-18).
export class CancelRideDto {
  @ApiPropertyOptional({
    description: 'Lý do hủy chuyến, tối thiểu 5 ký tự (BR-50)',
    example: 'Khách hàng báo hủy qua tổng đài',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
