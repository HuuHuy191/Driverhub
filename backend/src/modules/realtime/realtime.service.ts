import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { ADMIN_ROOM, driverRoom, SOCKET_EVENTS } from './events.constants';

// API.md mục 12.4/12.5 — một hàm phát sự kiện cho mỗi sự kiện server->client,
// để RidesModule/DriversModule/DispatchModule không phải tự ghép chuỗi tên
// sự kiện hay biết cấu trúc room. Đọc this.gateway.server tại thời điểm gọi
// (không cache) vì @WebSocketServer() chỉ được Nest gán giá trị sau khi
// module khởi tạo xong, có thể muộn hơn constructor của service này.
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  private emitToAdmin(event: string, payload: unknown): void {
    this.gateway.server?.to(ADMIN_ROOM).emit(event, payload);
  }

  private emitToDriver(driverId: string, event: string, payload: unknown): void {
    this.gateway.server?.to(driverRoom(driverId)).emit(event, payload);
  }

  // ── Server -> Tài xế (mục 12.4) ───────────────────────────────
  emitRideOffer(driverId: string, offer: unknown): void {
    this.emitToDriver(driverId, SOCKET_EVENTS.RIDE_OFFER, offer);
  }

  emitOfferExpired(
    driverId: string,
    payload: { offerId: string; rideId: string },
  ): void {
    this.emitToDriver(driverId, SOCKET_EVENTS.RIDE_OFFER_EXPIRED, payload);
  }

  emitOfferTaken(
    driverId: string,
    payload: { offerId: string; rideId: string },
  ): void {
    this.emitToDriver(driverId, SOCKET_EVENTS.RIDE_OFFER_TAKEN, payload);
  }

  emitRideAssigned(driverId: string, ride: unknown): void {
    this.emitToDriver(driverId, SOCKET_EVENTS.RIDE_ASSIGNED, ride);
  }

  emitRideCancelled(
    driverId: string,
    payload: { rideId: string; cancelledBy: string; reason: string },
  ): void {
    this.emitToDriver(driverId, SOCKET_EVENTS.RIDE_CANCELLED, payload);
  }

  emitWalletUpdated(
    driverId: string,
    payload: {
      balance: number;
      change: number;
      type: string;
      description: string;
      isBlocked: boolean;
    },
  ): void {
    this.emitToDriver(driverId, SOCKET_EVENTS.WALLET_UPDATED, payload);
  }

  emitDriverApproved(
    driverId: string,
    payload: { approvalStatus: string; approvedAt: Date },
  ): void {
    this.emitToDriver(driverId, SOCKET_EVENTS.DRIVER_APPROVED, payload);
  }

  emitDriverRejected(
    driverId: string,
    payload: { approvalStatus: string; rejectReason: string },
  ): void {
    this.emitToDriver(driverId, SOCKET_EVENTS.DRIVER_REJECTED, payload);
  }

  emitDriverForceOffline(driverId: string, payload: { reason: string }): void {
    this.emitToDriver(driverId, SOCKET_EVENTS.DRIVER_FORCE_OFFLINE, payload);
  }

  emitNotificationToDriver(driverId: string, notification: unknown): void {
    this.emitToDriver(driverId, SOCKET_EVENTS.NOTIFICATION_NEW, notification);
  }

  // ── Server -> Admin (mục 12.5) ────────────────────────────────
  emitRideCreated(ride: unknown): void {
    this.emitToAdmin(SOCKET_EVENTS.RIDE_CREATED, ride);
  }

  emitRideStatusChanged(payload: {
    rideId: string;
    rideCode: string;
    fromStatus: string | null;
    toStatus: string;
    driverId?: string | null;
    driverName?: string | null;
    at: Date;
  }): void {
    this.emitToAdmin(SOCKET_EVENTS.RIDE_STATUS_CHANGED, payload);
  }

  emitNoDriverFound(payload: {
    rideId: string;
    rideCode: string;
    roundsTried: number;
  }): void {
    this.emitToAdmin(SOCKET_EVENTS.RIDE_NO_DRIVER_FOUND, payload);
  }

  emitDispatchRoundStarted(payload: {
    rideId: string;
    round: number;
    driversNotified: number;
  }): void {
    this.emitToAdmin(SOCKET_EVENTS.DISPATCH_ROUND_STARTED, payload);
  }

  emitDriverStatusChanged(payload: {
    driverId: string;
    fullName: string;
    isOnline: boolean;
    latitude?: number | null;
    longitude?: number | null;
  }): void {
    this.emitToAdmin(SOCKET_EVENTS.DRIVER_STATUS_CHANGED, payload);
  }

  emitTopupRequested(payload: {
    requestId: string;
    driverName: string;
    amount: number;
  }): void {
    this.emitToAdmin(SOCKET_EVENTS.TOPUP_REQUESTED, payload);
  }
}
