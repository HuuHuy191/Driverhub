import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

// API.md mục 12 (BR-68) — POST /admin/topup/:id/reject: bắt buộc có lý do.
export class RejectTopupDto {
  @ApiProperty({ example: 'Ảnh biên lai không rõ số tiền chuyển khoản' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
