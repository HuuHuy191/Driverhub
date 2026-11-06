import { Logger, UnauthorizedException, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { TokenService } from '../auth/token.service';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { RideOffer } from '../rides/entities/ride-offer.entity';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import {
  ADMIN_ROOM,
  driverRoom,
  rideRoom,
  SOCKET_EVENTS,
} from './events.constants';

// ARCHITECTURE.md mục 5 / API.md mục 12 — Gateway mặc định (namespace "/").
// cors đọc từ biến môi trường CORS_ORIGINS giống app.enableCors() ở main.ts,
// tách riêng ở đây vì @WebSocketGateway() là decorator (đọc được lúc load
// module, không có ConfigService tại thời điểm này).
@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly tokenService: TokenService,
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    @InjectRepository(RideOffer)
    private readonly rideOfferRepo: Repository<RideOffer>,
  ) {}

  // API.md mục 12.1/12.2 — token sai/thiếu bị ngắt ngay lập tức (T19).
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        throw new UnauthorizedException();
      }

      const payload = this.tokenService.verifyAccessToken(token);
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      if (payload.role === 'DRIVER') {
        const driver = await this.driverProfileRepo.findOne({
          where: { userId: payload.sub },
        });
        if (!driver) {
          throw new UnauthorizedException();
        }
        client.data.driverId = driver.id;
        await client.join(driverRoom(driver.id));
      } else {
        await client.join(ADMIN_ROOM);
      }
    } catch {
      client.disconnect(true);
    }
  }

  // BR-27 — tài xế gửi vị trí mỗi 30 giây khi online. Cập nhật trực tiếp
  // DriverProfile (thay REST tạm PATCH /drivers/me/location) rồi báo cho
  // Admin để vẽ lên bản đồ giám sát (mục 12.5, driver:location_updated).
  @SubscribeMessage(SOCKET_EVENTS.DRIVER_LOCATION)
  async handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { latitude: number; longitude: number; heading?: number; speed?: number },
  ): Promise<void> {
    const driverId = client.data.driverId as string | undefined;
    if (!driverId) {
      return;
    }

    const now = new Date();
    await this.driverProfileRepo.update(driverId, {
      currentLatitude: data.latitude.toString(),
      currentLongitude: data.longitude.toString(),
      lastLocationUpdatedAt: now,
    });

    this.server.to(ADMIN_ROOM).emit(SOCKET_EVENTS.DRIVER_LOCATION_UPDATED, {
      driverId,
      latitude: data.latitude,
      longitude: data.longitude,
      at: now,
    });
  }

  // API.md mục 12.3 — chỉ để báo còn sống, không có cột lưu trạng thái
  // heartbeat trong schema hiện tại nên không cần ghi gì xuống CSDL.
  @SubscribeMessage(SOCKET_EVENTS.DRIVER_HEARTBEAT)
  handleDriverHeartbeat(): void {
    // no-op — kết nối Socket còn sống là đủ bằng chứng.
  }

  // Tương đương POST /rides/:id/view nhưng khóa theo offerId (dữ liệu client
  // gửi trong sự kiện này), idempotent giống RideOffersService.markViewed.
  @SubscribeMessage(SOCKET_EVENTS.OFFER_VIEWED)
  async handleOfferViewed(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { offerId: string },
  ): Promise<void> {
    const driverId = client.data.driverId as string | undefined;
    if (!driverId || !data?.offerId) {
      return;
    }

    await this.rideOfferRepo.update(
      { id: data.offerId, driverId, status: 'SENT' },
      { status: 'VIEWED', viewedAt: () => 'SYSUTCDATETIME()' },
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.RIDE_SUBSCRIBE)
  async handleRideSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string },
  ): Promise<void> {
    if (data?.rideId) {
      await client.join(rideRoom(data.rideId));
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.RIDE_UNSUBSCRIBE)
  async handleRideUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string },
  ): Promise<void> {
    if (data?.rideId) {
      await client.leave(rideRoom(data.rideId));
    }
  }
}
