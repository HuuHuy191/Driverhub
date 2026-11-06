# ARCHITECTURE — Kiến trúc hệ thống

> Tài liệu mô tả kiến trúc tổng thể, phân tầng, luồng dữ liệu và cấu trúc mã nguồn.

---

## 1. Sơ đồ kiến trúc tổng quát

```
┌──────────────────────────┐          ┌──────────────────────────┐
│      ADMIN WEB           │          │     DRIVER MOBILE        │
│  React 18 + TypeScript   │          │   Flutter 3 + Dart       │
│  Vite · Ant Design       │          │   Riverpod · flutter_map │
│  TanStack Query          │          │   Dio · secure_storage   │
│  socket.io-client        │          │   socket_io_client · FCM │
└────────────┬─────────────┘          └────────────┬─────────────┘
             │                                     │
             │  HTTPS (REST)                       │  HTTPS (REST)
             │  WebSocket (Socket.IO)              │  WebSocket (Socket.IO)
             │                                     │  FCM (push, một chiều)
             └──────────────┬──────────────────────┘
                            │
             ┌──────────────▼──────────────────────────────────┐
             │              BACKEND — NestJS 10                │
             │                                                 │
             │  ┌───────────────────────────────────────────┐  │
             │  │  Tầng trình bày (Presentation)            │  │
             │  │  Controller · Gateway · DTO · Swagger     │  │
             │  └───────────────────┬───────────────────────┘  │
             │  ┌───────────────────▼───────────────────────┐  │
             │  │  Tầng chắn (Cross-cutting)                │  │
             │  │  JwtAuthGuard · RolesGuard · ApprovedGuard│  │
             │  │  ValidationPipe · ExceptionFilter · Logger│  │
             │  └───────────────────┬───────────────────────┘  │
             │  ┌───────────────────▼───────────────────────┐  │
             │  │  Tầng nghiệp vụ (Service)                 │  │
             │  │  AuthService    · DriversService          │  │
             │  │  RidesService   · DispatchService         │  │
             │  │  WalletService  · SettingsService         │  │
             │  │  NotificationService · UploadService      │  │
             │  └───────────────────┬───────────────────────┘  │
             │  ┌───────────────────▼───────────────────────┐  │
             │  │  Tầng truy cập dữ liệu                    │  │
             │  │  TypeORM Repository · QueryRunner         │  │
             │  │  Entity · Migration                       │  │
             │  └───────────────────┬───────────────────────┘  │
             │  ┌───────────────────▼───────────────────────┐  │
             │  │  Tác vụ nền (@nestjs/schedule)            │  │
             │  │  OfferExpiryJob · DispatchRoundJob        │  │
             │  └───────────────────────────────────────────┘  │
             └──────┬─────────────────────┬────────────────────┘
                    │                     │
      ┌─────────────▼──────┐   ┌──────────▼─────────────────────┐
      │   SQL SERVER 2022  │   │      DỊCH VỤ NGOÀI             │
      │                    │   │  Cloudinary   — lưu ảnh        │
      │  14 bảng nghiệp vụ │   │  Firebase FCM — thông báo đẩy  │
      │  geography index   │   │  OpenStreetMap— bản đồ (client)│
      │  Transaction       │   │                                │
      └────────────────────┘   └────────────────────────────────┘
```

---

## 2. Bảng công nghệ

### 2.1. Backend

| Thành phần           | Công nghệ                           | Phiên bản | Lý do chọn                                                                                               |
| -------------------- | ----------------------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| Runtime              | Node.js                             | 20 LTS    | Ổn định, hỗ trợ dài hạn                                                                                  |
| Framework            | NestJS                              | 10.x      | Kiến trúc module + dependency injection sẵn có, hợp với việc trình bày phân tầng trong báo cáo           |
| Ngôn ngữ             | TypeScript                          | 5.x       | Kiểu tĩnh, giảm lỗi thời gian chạy                                                                       |
| ORM                  | TypeORM                             | 0.3.x     | Hỗ trợ SQL Server tốt nhất trong hệ sinh thái NestJS; có `QueryRunner` để kiểm soát transaction thủ công |
| Driver CSDL          | mssql (tedious)                     | 10.x      | Driver chính thức cho SQL Server                                                                         |
| Realtime             | Socket.IO                           | 4.x       | Tự động fallback, có cơ chế room, tài liệu tốt                                                           |
| Xác thực             | @nestjs/jwt + Passport              | —         | Chuẩn của hệ sinh thái NestJS                                                                            |
| Băm mật khẩu         | bcrypt                              | 5.x       | Đã kiểm chứng, có tham số cost điều chỉnh được                                                           |
| Kiểm tra dữ liệu vào | class-validator + class-transformer | —         | Khai báo bằng decorator, tích hợp `ValidationPipe`                                                       |
| Tài liệu API         | @nestjs/swagger                     | 7.x       | Tự sinh OpenAPI từ DTO, chụp màn hình đưa vào báo cáo                                                    |
| Tác vụ định kỳ       | @nestjs/schedule                    | 4.x       | Chạy job quét lời mời hết hạn                                                                            |
| Lưu trữ ảnh          | cloudinary                          | 2.x       | Gói miễn phí đủ dùng, không cần tự quản lý ổ đĩa                                                         |
| Thông báo đẩy        | firebase-admin                      | 12.x      | Gửi FCM từ phía máy chủ                                                                                  |
| Kiểm thử             | Jest + Supertest                    | —         | Đi kèm NestJS                                                                                            |

### 2.2. Web quản trị

| Thành phần              | Công nghệ        | Lý do chọn                                                                                            |
| ----------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| Thư viện UI             | React 18         | Phổ biến, nhiều tài liệu                                                                              |
| Công cụ build           | Vite 5           | Khởi động và nạp lại rất nhanh                                                                        |
| Ngôn ngữ                | TypeScript       | Dùng chung kiểu dữ liệu với backend                                                                   |
| Bộ giao diện            | Ant Design 5     | **Có sẵn Table, Form, Modal, DatePicker** — không cần tự dựng giao diện, tiết kiệm phần lớn thời gian |
| Quản lý dữ liệu máy chủ | TanStack Query 5 | Tự cache, tự làm mới, xử lý trạng thái tải                                                            |
| Điều hướng              | React Router 6   | Tiêu chuẩn                                                                                            |
| Gọi HTTP                | Axios            | Có interceptor để tự gắn token và tự refresh                                                          |
| Realtime                | socket.io-client | Đồng bộ với backend                                                                                   |
| Biểu đồ                 | Recharts         | Dashboard thống kê                                                                                    |

### 2.3. Ứng dụng di động

| Thành phần         | Công nghệ                       | Lý do chọn                                                         |
| ------------------ | ------------------------------- | ------------------------------------------------------------------ |
| Framework          | Flutter 3.x                     | Một mã nguồn, giao diện mượt                                       |
| Quản lý trạng thái | Riverpod 2                      | Kiểm tra được tại thời điểm biên dịch, dễ kiểm thử hơn Provider    |
| Gọi HTTP           | Dio 5                           | Interceptor mạnh, hỗ trợ tự refresh token                          |
| Realtime           | socket_io_client 2              | Tương thích Socket.IO v4                                           |
| **Bản đồ**         | **flutter_map + OpenStreetMap** | **Miễn phí hoàn toàn, không cần thẻ tín dụng như Google Maps API** |
| Định vị            | geolocator                      | Lấy tọa độ và theo dõi thay đổi vị trí                             |
| Lưu trữ bảo mật    | flutter_secure_storage          | Lưu refresh token vào Keystore của Android                         |
| Thông báo đẩy      | firebase_messaging              | Nhận chuyến khi ứng dụng chạy nền                                  |
| Thông báo cục bộ   | flutter_local_notifications     | Hiển thị thông báo kèm âm thanh khi có chuyến mới                  |
| Định dạng          | intl                            | Định dạng tiền VNĐ và ngày giờ tiếng Việt                          |

> **Ghi chú về lựa chọn bản đồ:** Google Maps SDK yêu cầu khai báo thẻ tín dụng để kích
> hoạt API key, kể cả khi dùng trong hạn mức miễn phí. OpenStreetMap qua `flutter_map` không
> có rào cản này và hoàn toàn đủ cho nhu cầu hiển thị điểm đón / điểm trả của đồ án.

---

## 3. Phân tầng backend và trách nhiệm

### 3.1. Nguyên tắc phân tầng

```
Controller  →  chỉ nhận request, kiểm tra dữ liệu vào, gọi Service, trả response
              KHÔNG chứa logic nghiệp vụ, KHÔNG truy vấn CSDL trực tiếp

Guard       →  kiểm soát truy cập (đã đăng nhập chưa, đúng vai trò không,
               hồ sơ đã duyệt chưa)

Service     →  toàn bộ quy tắc nghiệp vụ, quản lý transaction
               KHÔNG biết gì về HTTP (không dùng Request, Response)

Repository  →  truy vấn CSDL
               KHÔNG chứa quyết định nghiệp vụ

Gateway     →  chỉ phát và nhận sự kiện Socket
               Logic nghiệp vụ ủy thác cho Service
```

**Quy tắc bất di bất dịch:** nếu một đoạn mã quyết định _"có được phép hay không"_,
_"tính ra bao nhiêu tiền"_ hoặc _"chuyển sang trạng thái nào"_, nó **phải** nằm trong
Service, không nằm ở Controller và càng không nằm ở client.

### 3.2. Các Guard

| Guard                 | Kiểm tra                                                                | Áp dụng cho                                                            |
| --------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `JwtAuthGuard`        | Access token hợp lệ, chưa hết hạn                                       | Toàn cục, trừ endpoint đánh dấu `@Public()`                            |
| `RolesGuard`          | `user.role` nằm trong danh sách `@Roles(...)`                           | Endpoint dành riêng cho Admin hoặc Driver                              |
| `ApprovedDriverGuard` | `DriverProfile.approvalStatus = 'APPROVED'` và `User.status = 'ACTIVE'` | Mọi endpoint nghiệp vụ của tài xế (nhận chuyến, ví, trạng thái online) |
| `WsJwtGuard`          | Token trong `handshake.auth` hợp lệ                                     | Kết nối Socket.IO                                                      |

### 3.3. Xử lý lỗi thống nhất

Toàn bộ lỗi đi qua một `AllExceptionsFilter` duy nhất và trả về đúng một định dạng:

```json
{
  "statusCode": 409,
  "errorCode": "RIDE_ALREADY_TAKEN",
  "message": "Chuyến đã có tài xế khác nhận",
  "timestamp": "2026-09-18T10:30:00.000Z",
  "path": "/api/v1/rides/abc-123/accept"
}
```

Nhờ vậy client chỉ cần đọc `errorCode` để xử lý, không phải phân tích chuỗi thông báo.
Danh sách `errorCode` xem tại [`BUSINESS-RULES.md` mục 14](./BUSINESS-RULES.md#14-bảng-tổng-hợp-mã-lỗi-nghiệp-vụ).

---

## 4. Cấu trúc thư mục backend

```
backend/src/
├── main.ts                      # Điểm khởi động, cấu hình Swagger, CORS, ValidationPipe
├── app.module.ts                # Module gốc
│
├── config/
│   ├── configuration.ts         # Đọc biến môi trường thành object có kiểu
│   └── validation.schema.ts     # Kiểm tra biến môi trường bằng Joi khi khởi động
│
├── common/
│   ├── decorators/              # @Public, @Roles, @CurrentUser
│   ├── guards/                  # JwtAuthGuard, RolesGuard, ApprovedDriverGuard, WsJwtGuard
│   ├── filters/                 # AllExceptionsFilter
│   ├── interceptors/            # LoggingInterceptor, TransformInterceptor
│   ├── exceptions/              # BusinessException (mang theo errorCode)
│   ├── dto/                     # PaginationDto, PaginatedResponseDto
│   └── utils/                   # money.util, distance.util
│
├── database/
│   ├── data-source.ts           # Cấu hình TypeORM cho CLI migration
│   ├── migrations/              # Các file migration theo thứ tự thời gian
│   └── seeds/                   # seed-admin.ts, seed-config.ts, seed-demo-data.ts
│
└── modules/
    ├── auth/
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── token.service.ts
    │   ├── strategies/jwt.strategy.ts
    │   └── dto/
    ├── users/
    ├── drivers/
    │   ├── drivers.controller.ts        # API cho tài xế
    │   ├── admin-drivers.controller.ts  # API duyệt hồ sơ cho Admin
    │   ├── drivers.service.ts
    │   ├── driver-documents.service.ts
    │   └── entities/
    ├── vehicles/
    ├── customers/
    ├── rides/
    │   ├── rides.controller.ts
    │   ├── admin-rides.controller.ts
    │   ├── rides.service.ts
    │   ├── ride-state-machine.ts        # Bảng chuyển trạng thái hợp lệ (BR-31)
    │   ├── fare-calculator.service.ts   # Công thức tính giá (BR-36)
    │   └── entities/
    ├── dispatch/
    │   ├── dispatch.service.ts          # Thuật toán điều phối (BR-40 → BR-42)
    │   ├── driver-matcher.service.ts    # Truy vấn geography chọn tài xế
    │   └── jobs/offer-expiry.job.ts     # Job quét lời mời hết hạn (BR-43)
    ├── wallets/
    │   ├── wallets.controller.ts
    │   ├── wallet.service.ts            # applyTransaction() — cửa duy nhất đổi số dư
    │   ├── settlement.service.ts        # Transaction quyết toán (BR-63)
    │   ├── topup.service.ts
    │   └── entities/
    ├── realtime/
    │   ├── realtime.gateway.ts          # Socket.IO Gateway
    │   ├── room.service.ts              # Quản lý room driver:{id} và admin
    │   └── events.constants.ts          # Tên sự kiện dùng chung
    ├── notifications/
    │   ├── notification.service.ts
    │   └── fcm.service.ts
    ├── uploads/
    │   └── cloudinary.service.ts
    └── settings/
        └── settings.service.ts          # Cache SystemConfig (BR-02)
```

---

## 5. Giao tiếp thời gian thực

### 5.1. Xác thực kết nối Socket

Socket.IO **không** tự có cơ chế xác thực. Nếu bỏ qua bước này, bất kỳ ai cũng kết nối được
và nghe lén thông tin chuyến xe của người khác.

**Phía client (Flutter):**

```dart
socket = IO.io(baseUrl, IO.OptionBuilder()
    .setTransports(['websocket'])
    .setAuth({'token': accessToken})      // gửi token trong handshake
    .build());
```

**Phía backend (`realtime.gateway.ts`):**

```typescript
async handleConnection(client: Socket) {
  const token = client.handshake.auth?.token;
  try {
    const payload = await this.tokenService.verifyAccessToken(token);
    client.data.userId = payload.sub;
    client.data.role   = payload.role;

    if (payload.role === 'DRIVER') {
      const driverId = await this.driversService.getDriverIdByUserId(payload.sub);
      client.data.driverId = driverId;
      client.join(`driver:${driverId}`);   // room riêng cho từng tài xế
    } else {
      client.join('admin');                // room chung cho Admin
    }
  } catch {
    client.disconnect(true);               // token sai -> ngắt ngay
  }
}
```

### 5.2. Mô hình room

| Room                | Thành viên                              | Dùng để                                                    |
| ------------------- | --------------------------------------- | ---------------------------------------------------------- |
| `driver:{driverId}` | Đúng một tài xế (có thể nhiều thiết bị) | Gửi lời mời chuyến, cập nhật ví, thông báo riêng           |
| `admin`             | Toàn bộ Admin đang mở trang quản trị    | Phát tin chuyến mới, đổi trạng thái, tài xế online/offline |
| `ride:{rideId}`     | Tài xế được gán + Admin                 | Theo dõi tiến trình một chuyến cụ thể                      |

> Lời mời chuyến **không bao giờ** phát kiểu broadcast toàn hệ thống. Mỗi tài xế chỉ nhận
> được đúng lời mời gửi cho mình, qua room riêng.

### 5.3. Danh sách sự kiện

Xem đặc tả đầy đủ kèm cấu trúc dữ liệu tại [`API.md` mục 8](./API.md#8-sự-kiện-socketio).

---

## 6. Luồng dữ liệu của các nghiệp vụ chính

### 6.1. Điều phối chuyến xe

```
Admin (React)                Backend (NestJS)                  Tài xế (Flutter)
     │                             │                                  │
     │  POST /admin/rides          │                                  │
     ├────────────────────────────►│                                  │
     │                             │ FareCalculator.calculate()       │
     │                             │ INSERT Ride (status=SEARCHING)   │
     │                             │ INSERT RideStatusHistory         │
     │  201 Created                │                                  │
     │◄────────────────────────────┤                                  │
     │                             │                                  │
     │                             │ DispatchService.start(rideId)    │
     │                             │ ── vòng 1 ──                     │
     │                             │ DriverMatcher: truy vấn geography│
     │                             │ INSERT 5 x RideOffer (SENT)      │
     │                             │                                  │
     │                             │  emit "ride:offer"               │
     │                             ├─────────────────────────────────►│
     │                             │  FCM push (nếu app chạy nền)     │
     │                             ├─────────────────────────────────►│
     │  emit "ride:created"        │                                  │
     │◄────────────────────────────┤                                  │
     │                             │      Chờ 20 giây                 │
     │                             │                                  │
     │                             │      POST /rides/:id/accept      │
     │                             │◄─────────────────────────────────┤
     │                             │ UPDATE Ride ... WHERE            │
     │                             │   status='SEARCHING'             │
     │                             │   AND driverId IS NULL           │
     │                             │                                  │
     │                             │ @@ROWCOUNT = 1 -> thắng          │
     │                             │ offer người thắng -> ACCEPTED    │
     │                             │ offer còn lại    -> LOST         │
     │                             │                                  │
     │                             │  emit "ride:assigned"            │
     │                             ├─────────────────────────────────►│
     │                             │  emit "ride:offer_taken"         │
     │                             ├────────────► (các tài xế còn lại)│
     │  emit "ride:status_changed" │                                  │
     │◄────────────────────────────┤                                  │
```

### 6.2. Quyết toán khi hoàn thành chuyến

```
Tài xế (Flutter)                    Backend                      SQL Server
      │                                │                              │
      │ PATCH /rides/:id/status        │                              │
      │      { status: "COMPLETED" }   │                              │
      ├───────────────────────────────►│                              │
      │                                │ RidesService.complete()      │
      │                                │                              │
      │                                │  BEGIN TRANSACTION           │
      │                                ├─────────────────────────────►│
      │                                │                              │
      │                                │  (1) UPDATE Ride SET         │
      │                                │      status='COMPLETED'      │
      │                                │      WHERE status='IN_PROGRESS'
      │                                │      -- chốt idempotent      │
      │                                │                              │
      │                                │  @@ROWCOUNT=0 -> ROLLBACK 409│
      │                                │                              │
      │                                │  (2) đọc COMMISSION_RATE     │
      │                                │  (3) tính fee & earning      │
      │                                │  (4) UPDATE Ride snapshot    │
      │                                │  (5) INSERT StatusHistory    │
      │                                │  (6a) UPDATE ví tài xế       │
      │                                │       INSERT WalletTx DEBIT  │
      │                                │  (6b) UPDATE ví nền tảng     │
      │                                │       INSERT WalletTx CREDIT │
      │                                │                              │
      │                                │  COMMIT                      │
      │                                ├─────────────────────────────►│
      │  200 OK                        │                              │
      │◄───────────────────────────────┤                              │
      │  emit "wallet:updated"         │                              │
      │◄───────────────────────────────┤                              │
```

---

## 7. Quản lý transaction trong TypeORM

Mọi nghiệp vụ động tới tiền **bắt buộc** dùng `QueryRunner` tường minh, không dùng
`@Transactional()` ngầm định:

```typescript
async completeRide(rideId: string, driverId: string): Promise<Ride> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // (1) Chốt trạng thái — đồng thời là chốt idempotent (BR-64 lớp 1)
    const result = await queryRunner.manager.query(
      `UPDATE Ride
       SET status = 'COMPLETED',
           completedAt = SYSUTCDATETIME(),
           finalFare = ISNULL(finalFare, estimatedFare)
       WHERE id = @0 AND status = 'IN_PROGRESS' AND driverId = @1`,
      [rideId, driverId],
    );

    if (result.rowsAffected?.[0] === 0) {
      throw new BusinessException('INVALID_STATE_TRANSITION', 409);
    }

    // (2)-(6) ... các bước còn lại, tất cả dùng queryRunner.manager

    await queryRunner.commitTransaction();
    return ride;
  } catch (error) {
    await queryRunner.rollbackTransaction();   // BR-65
    throw error;
  } finally {
    await queryRunner.release();               // luôn giải phóng kết nối
  }
}
```

**Ba quy tắc bắt buộc:**

1. **Không gọi API bên ngoài bên trong transaction.** Gửi FCM, tải ảnh lên
   Cloudinary đều phải nằm **sau** `commit`. Một dịch vụ ngoài chậm hoặc lỗi không được phép
   giữ khóa dòng hoặc làm hỏng dữ liệu.
2. **Không phát sự kiện Socket bên trong transaction.** Nếu transaction rollback sau khi đã
   phát sự kiện, client sẽ nhận thông tin sai lệch.
3. **Luôn có `finally { release() }`.** Quên giải phóng `QueryRunner` sẽ làm cạn kiệt
   connection pool và treo toàn bộ hệ thống.

---

## 8. Chiến lược xử lý token phía client

### 8.1. Sơ đồ tự làm mới token

```
Request đi kèm access token
        │
        ▼
   Server trả 401?
        │
   ┌────┴────┐
   │ Không   │ Có
   ▼         ▼
 Trả về   Có refresh token không?
 kết quả       │
          ┌────┴────┐
          │ Không   │ Có
          ▼         ▼
     Đăng xuất   POST /auth/refresh
                      │
                 ┌────┴────┐
                 │ Thành   │ Thất bại
                 │ công    │
                 ▼         ▼
            Lưu cặp     Đăng xuất,
            token mới,  chuyển về
            gửi lại     màn hình
            request cũ  đăng nhập
```

### 8.2. Chống làm mới song song

Khi nhiều request cùng nhận `401` một lúc, chỉ **một** lời gọi `/auth/refresh` được phép
chạy. Các request còn lại xếp hàng chờ kết quả rồi dùng chung token mới. Nếu không làm vậy,
cơ chế xoay vòng refresh token (BR-13) sẽ hiểu nhầm là token bị đánh cắp và đăng xuất người
dùng.

---

## 9. Bảo mật

| Lớp                   | Biện pháp                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **Mật khẩu**          | `bcrypt` cost 10, không bao giờ ghi log                                                   |
| **Refresh token**     | Băm trước khi lưu, có xoay vòng, phát hiện dùng lại (BR-13)                               |
| **Truyền tải**        | HTTPS ở môi trường triển khai; HTTP chỉ dùng khi phát triển cục bộ                        |
| **Phân quyền**        | `RolesGuard` ở tầng endpoint, kiểm tra quyền sở hữu ở tầng Service (BR-32)                |
| **Socket**            | Xác thực JWT trong handshake, tách room theo từng tài xế                                  |
| **Dữ liệu vào**       | `ValidationPipe` với `whitelist: true, forbidNonWhitelisted: true` — tự loại bỏ trường lạ |
| **SQL Injection**     | TypeORM tham số hóa toàn bộ truy vấn; **không nối chuỗi SQL** kể cả với raw query         |
| **Giới hạn tần suất** | `@nestjs/throttler` cho `/auth/login`, `/rides/:id/accept`                               |
| **CORS**              | Chỉ cho phép origin của trang Admin                                                       |
| **Biến bí mật**       | Toàn bộ trong `.env`, **không commit lên Git**; kiểm tra bằng Joi khi khởi động           |

---

## 10. Quy ước đặt tên xuyên suốt dự án

| Đối tượng        | Quy ước                                  | Ví dụ                                |
| ---------------- | ---------------------------------------- | ------------------------------------ |
| Bảng CSDL        | PascalCase, **số ít**                    | `DriverProfile`, `WalletTransaction` |
| Cột CSDL         | camelCase                                | `approvalStatus`, `platformFee`      |
| Khóa chính       | `id`, kiểu `uniqueidentifier`            | `id`                                 |
| Khóa ngoại       | `<tênBảng>Id`                            | `driverId`, `rideId`                 |
| Ràng buộc        | `PK_`, `FK_`, `UQ_`, `CK_`, `IX_`, `UX_` | `UQ_RideOffer_Ride_Driver`           |
| Giá trị enum     | UPPER_SNAKE_CASE                         | `IN_PROGRESS`, `COMMISSION_FEE`      |
| Đường dẫn API    | kebab-case, danh từ **số nhiều**         | `/api/v1/ride-offers`                |
| Sự kiện Socket   | `nhómViệc:hànhĐộng` (lowercase)          | `ride:offer`, `wallet:updated`       |
| File TypeScript  | kebab-case                               | `wallet.service.ts`                  |
| Class TypeScript | PascalCase                               | `WalletService`                      |
| File Dart        | snake_case                               | `ride_detail_page.dart`              |
| Biến môi trường  | UPPER_SNAKE_CASE                         | `DB_PASSWORD`                        |
| Mã lỗi nghiệp vụ | UPPER_SNAKE_CASE                         | `RIDE_ALREADY_TAKEN`                 |

---

## 11. Những quyết định kiến trúc đáng chú ý

| Quyết định                                      | Lý do                                                                                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Optimistic concurrency thay vì khóa bi quan** | `UPDATE ... WHERE` không giữ khóa lâu, không có nguy cơ deadlock, và diễn đạt ý định nghiệp vụ rõ ràng ngay trong câu lệnh                                      |
| **Không dùng Redis**                            | Hệ thống chạy một tiến trình duy nhất. Redis chỉ cần khi mở rộng nhiều instance Socket.IO — nằm ngoài phạm vi đồ án. Việc này được ghi nhận là giới hạn đã biết |
| **Dùng cả Socket.IO và FCM**                    | Socket.IO chết khi ứng dụng bị hệ điều hành thu hồi; FCM có độ trễ. Hai kênh bù trừ cho nhau (BR-71, BR-72)                                                     |
| **Snapshot `commissionRate` vào bảng `Ride`**   | Đảm bảo báo cáo doanh thu lịch sử vẫn đúng sau khi chính sách phí thay đổi (BR-60)                                                                              |
| **Ghi sổ kép cho phí nền tảng**                 | Cho phép đối soát ở cấp hệ thống: tổng số dư toàn bộ ví luôn bằng 0 nếu không có nạp/rút (BR-62)                                                                |
| **Tách `estimatedFare` và `finalFare`**         | Mở đường cho phụ thu ở giai đoạn sau mà không phải sửa dữ liệu cũ                                                                                               |
| **Dùng Ant Design thay vì tự viết CSS**         | Trang Admin không phải trọng tâm đề tài; dồn thời gian cho backend và ứng dụng di động                                                                          |
| **OpenStreetMap thay vì Google Maps**           | Không cần khai báo thẻ tín dụng, đủ dùng cho nhu cầu hiển thị của đồ án                                                                                         |
| **Cột `isOnline` không tự tắt khi mất socket**  | Mạng di động chập chờn là bình thường; dùng mốc thời gian vị trí để lọc thay thế (BR-28, BR-29)                                                                 |
