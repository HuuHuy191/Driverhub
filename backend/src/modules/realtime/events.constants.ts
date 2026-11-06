// API.md mục 12 — toàn bộ tên sự kiện Socket.IO, gom một chỗ để tránh gõ
// nhầm chuỗi ở nhiều nơi (gateway, RealtimeService, DispatchService, ...).
export const SOCKET_EVENTS = {
  // 12.3 — Client -> Server
  DRIVER_LOCATION: 'driver:location',
  DRIVER_HEARTBEAT: 'driver:heartbeat',
  OFFER_VIEWED: 'offer:viewed',
  RIDE_SUBSCRIBE: 'ride:subscribe',
  RIDE_UNSUBSCRIBE: 'ride:unsubscribe',

  // 12.4 — Server -> Tài xế
  RIDE_OFFER: 'ride:offer',
  RIDE_OFFER_EXPIRED: 'ride:offer_expired',
  RIDE_OFFER_TAKEN: 'ride:offer_taken',
  RIDE_ASSIGNED: 'ride:assigned',
  RIDE_CANCELLED: 'ride:cancelled',
  WALLET_UPDATED: 'wallet:updated',
  DRIVER_APPROVED: 'driver:approved',
  DRIVER_REJECTED: 'driver:rejected',
  DRIVER_FORCE_OFFLINE: 'driver:force_offline',
  // BR-74 — kênh chung cho các thông báo trong bảng Notification không có
  // sẵn sự kiện riêng (vd. yêu cầu nạp tiền duyệt/từ chối, chuyến bị Admin
  // hủy) — mang nguyên payload bản ghi Notification vừa ghi CSDL.
  NOTIFICATION_NEW: 'notification:new',

  // 12.5 — Server -> Admin
  RIDE_CREATED: 'ride:created',
  RIDE_STATUS_CHANGED: 'ride:status_changed',
  RIDE_NO_DRIVER_FOUND: 'ride:no_driver_found',
  DISPATCH_ROUND_STARTED: 'dispatch:round_started',
  DRIVER_STATUS_CHANGED: 'driver:status_changed',
  DRIVER_LOCATION_UPDATED: 'driver:location_updated',
  TOPUP_REQUESTED: 'topup:requested',
} as const;

// API.md mục 12.2 — room tự động tham gia khi kết nối, cộng thêm room
// ride:{rideId} (mục 12.3, ride:subscribe/unsubscribe).
export const ADMIN_ROOM = 'admin';
export const driverRoom = (driverId: string): string => `driver:${driverId}`;
export const rideRoom = (rideId: string): string => `ride:${rideId}`;
