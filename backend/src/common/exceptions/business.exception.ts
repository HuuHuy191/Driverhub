import { HttpException } from '@nestjs/common';

// ARCHITECTURE.md mục 3.3: mang theo errorCode để AllExceptionsFilter chuẩn
// hóa mọi lỗi về đúng một định dạng, client chỉ cần đọc errorCode để xử lý.
export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: string,
    httpStatus: number,
    message: string,
  ) {
    super({ errorCode, message }, httpStatus);
  }
}
