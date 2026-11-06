import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

// Lớp phòng vệ thứ hai cho @SubscribeMessage: handleConnection() của
// RealtimeGateway đã ngắt kết nối ngay nếu token sai/thiếu (API.md mục 12.1),
// guard này chỉ xác nhận lại client.data.userId đã được gán trước khi cho
// message handler chạy — phòng trường hợp gọi handler qua đường khác.
@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    if (!client.data?.userId) {
      throw new WsException('Unauthorized');
    }
    return true;
  }
}
