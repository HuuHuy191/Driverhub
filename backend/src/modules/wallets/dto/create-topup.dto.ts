import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

// API.md mục 8 (#52) — POST /wallet/topup. multipart/form-data: field
// "amount" (số tiền, BR-69 kiểm tra khoảng hợp lệ ở service để trả đúng
// errorCode TOPUP_AMOUNT_INVALID thay vì lỗi validate chung chung) + field
// "file" tùy chọn (ảnh biên lai — xem WalletController).
export class CreateTopupDto {
  @ApiProperty({ example: 200000 })
  @Type(() => Number)
  @IsNumber()
  amount: number;
}
