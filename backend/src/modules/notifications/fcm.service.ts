import { Injectable, Logger } from '@nestjs/common';

// BR-71/BR-72 — kênh Firebase Cloud Messaging (khi app chạy nền/đã bị tắt).
// CHƯA triển khai: cần app Flutter thật để lấy fcmToken và cấu hình Firebase
// Admin SDK (FIREBASE_* trong configuration.ts đã có sẵn chỗ, chưa dùng).
// TODO: tich hop FCM o Chang 21.
@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);

  async sendToUser(
    _userId: string,
    _title: string,
    _body: string,
    _data?: Record<string, string>,
  ): Promise<void> {
    this.logger.debug('FCM chưa triển khai — bỏ qua gửi push.');
  }
}
