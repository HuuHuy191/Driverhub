# API — Đặc tả REST API và sự kiện Socket.IO

> **Base URL:** `http://localhost:3000/api/v1`
> **Tài liệu tương tác:** `http://localhost:3000/api/docs` (Swagger UI)
>
> Thiết kế ban đầu chỉ có 7 endpoint. Bản đặc tả này gồm **65 endpoint** và **16 sự kiện Socket**.

---

## 1. Quy ước chung

### 1.1. Xác thực

Mọi endpoint yêu cầu header sau, trừ những endpoint đánh dấu 🔓 **Public**:

```http
Authorization: Bearer <accessToken>
```

### 1.2. Ký hiệu quyền truy cập

| Ký hiệu | Ý nghĩa                                              |
| ------- | ---------------------------------------------------- |
| 🔓      | Không cần đăng nhập                                  |
| 👤      | Cần đăng nhập (mọi vai trò)                          |
| 🚗      | Chỉ tài xế **đã được duyệt** (`ApprovedDriverGuard`) |
| ⏳      | Tài xế kể cả khi chưa được duyệt                     |
| 🛡️      | Chỉ Admin                                            |

### 1.3. Định dạng phản hồi thành công

```json
{
  "data": {},
  "timestamp": "2026-09-18T10:30:00.000Z"
}
```

Với danh sách có phân trang:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 },
  "timestamp": "2026-09-18T10:30:00.000Z"
}
```

### 1.4. Định dạng phản hồi lỗi

```json
{
  "statusCode": 409,
  "errorCode": "RIDE_ALREADY_TAKEN",
  "message": "Chuyến đã có tài xế khác nhận",
  "timestamp": "2026-09-18T10:30:00.000Z",
  "path": "/api/v1/rides/abc-123/accept"
}
```

Client xử lý theo `errorCode`, **không** phân tích chuỗi `message`.
Danh sách đầy đủ: [`BUSINESS-RULES.md` mục 14](./BUSINESS-RULES.md#14-bảng-tổng-hợp-mã-lỗi-nghiệp-vụ).

### 1.5. Tham số phân trang chung

| Tham số | Kiểu            | Mặc định    | Ghi chú      |
| ------- | --------------- | ----------- | ------------ |
| `page`  | number          | 1           | Bắt đầu từ 1 |
| `limit` | number          | 20          | Tối đa 100   |
| `sort`  | string          | `createdAt` | Tên cột      |
| `order` | `asc` \| `desc` | `desc`      |              |

### 1.6. Giới hạn tần suất

| Nhóm endpoint            | Giới hạn               |
| ------------------------ | ---------------------- |
| `POST /auth/login`       | 5 lần / phút / IP      |
| `POST /rides/:id/accept` | 30 lần / phút / tài xế |
| Còn lại                  | 100 lần / phút / IP    |

---

## 2. Xác thực — `/auth`

| #   | Method | Endpoint                | Quyền | Chức năng                   |
| --- | ------ | ----------------------- | ----- | --------------------------- |
| 1   | POST   | `/auth/register`        | 🔓    | Đăng ký tài xế              |
| 2   | POST   | `/auth/login`           | 🔓    | Đăng nhập                   |
| 3   | POST   | `/auth/refresh`          | 🔓    | Làm mới cặp token           |
| 4   | POST   | `/auth/logout`           | 👤    | Đăng xuất thiết bị hiện tại |
| 5   | PATCH  | `/auth/password/change` | 👤    | Đổi mật khẩu khi đã đăng nhập |
| 6   | GET    | `/auth/me`              | 👤    | Thông tin người dùng hiện tại |

### 2.1. `POST /auth/register` 🔓

```jsonc
// Request — application/json, không kèm ảnh giấy tờ
{
  "email": "taixe01@gmail.com",
  "password": "MatKhau123",
  "fullName": "Nguyễn Văn An",
  "phoneNumber": "0912345678",
  "dateOfBirth": "1995-04-12",
  "citizenIdNumber": "012345678901",
  "citizenIdIssueDate": "2021-06-15",
  "driverLicenseNumber": "790123456789",
  "driverLicenseIssueDate": "2022-01-20",
  "temporaryAddress": "Số 10, Cầu Giấy, Hà Nội",
  "vehicleType": "MOTORBIKE",
  "vehicleBrand": "Honda",
  "vehicleModelName": "Vision",
  "vehicleLicensePlate": "29X1-12345",
  "vehicleColor": "Đen"
}

// 201 Created
{
  "data": {
    "userId": "8f14e45f-...",
    "driverId": "3c6e0b8a-...",
    "approvalStatus": "PENDING",
    "message": "Hồ sơ đã được gửi. Vui lòng chờ quản trị viên duyệt."
  }
}

// 409 EMAIL_ALREADY_EXISTS · 409 PHONE_ALREADY_EXISTS
// 400 BAD_REQUEST nếu thiếu trường bắt buộc
```

### 2.2. `POST /auth/login` 🔓

```jsonc
// Request
{
  "email": "taixe01@gmail.com",
  "password": "MatKhau123",
  "deviceId": "android-a1b2c3",    // tùy chọn, dùng cho mobile
  "fcmToken": "dXNlcl90b2tlbi..."  // tùy chọn, để nhận thông báo đẩy
}

// 200 OK
{
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "expiresIn": 900,
    "user": {
      "id": "8f14e45f-...",
      "email": "taixe01@gmail.com",
      "role": "DRIVER",
      "status": "ACTIVE"
    },
    "driver": {
      "id": "3c6e0b8a-...",
      "fullName": "Nguyễn Văn An",
      "approvalStatus": "APPROVED",
      "rejectReason": null,
      "isOnline": false,
      "avatarUrl": "https://res.cloudinary.com/..."
    }
  }
}

// 401 INVALID_CREDENTIALS · 403 ACCOUNT_LOCKED
```

> Khi `approvalStatus` khác `APPROVED`, đăng nhập **vẫn thành công** nhưng ứng dụng chỉ mở
> màn hình "Chờ duyệt" (BR-07).

### 2.3. `POST /auth/refresh` 🔓

```jsonc
// Request
{ "refreshToken": "eyJhbGciOi..." }

// 200 OK — token cũ bị thu hồi, cấp cặp mới (BR-13)
{ "data": { "accessToken": "...", "refreshToken": "...", "expiresIn": 900 } }

// 401 — token không hợp lệ hoặc đã bị dùng lại
//       (dùng lại => thu hồi toàn bộ phiên của tài khoản)
```

### 2.4. `PATCH /auth/password/change` 👤

```jsonc
// Request
{
  "currentPassword": "MatKhauCu123",
  "newPassword": "MatKhauMoi123"
}

// 200 OK — đổi mật khẩu, thu hồi toàn bộ refresh token; tài khoản cần đăng nhập lại
{ "data": { "message": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." } }

// 401 CURRENT_PASSWORD_INVALID
// 400 — mật khẩu mới không đạt BR-06
```

---

## 3. Hồ sơ tài xế — `/drivers`

| #   | Method | Endpoint                | Quyền | Chức năng                        |
| --- | ------ | ----------------------- | ----- | -------------------------------- |
| 7  | GET    | `/drivers/me`           | ⏳    | Xem hồ sơ của mình               |
| 8  | PATCH  | `/drivers/me`           | ⏳    | Cập nhật hồ sơ                   |
| 9  | POST   | `/drivers/me/avatar`    | ⏳    | Tải ảnh đại diện                 |
| 10 | GET    | `/drivers/me/documents` | ⏳    | Xem ảnh giấy tờ lịch sử          |
| 11 | POST   | `/drivers/me/resubmit`  | ⏳    | Gửi lại hồ sơ sau khi bị từ chối |
| 12 | PATCH  | `/drivers/me/status`    | 🚗    | Bật / tắt trạng thái online      |
| 13 | GET    | `/drivers/me/stats`     | 🚗    | Thống kê thu nhập của bản thân   |

`GET /drivers/me` trả thông tin cá nhân, CCCD/GPLX, avatar, `rejectReason` và danh sách xe của tài xế. `PATCH /drivers/me` cập nhật thông tin cá nhân, CCCD/GPLX và địa chỉ.

`GET /drivers/me/documents` chỉ trả các giấy tờ ảnh lịch sử đã lưu trước đây. Đăng ký mới và gửi lại hồ sơ không tải ảnh; tài xế cập nhật thông tin CCCD/GPLX và Admin kiểm tra thủ công. `GET /admin/drivers/:id` trả thêm `citizenIdNumber`, `citizenIdIssueDate`, `driverLicenseNumber` và `driverLicenseIssueDate` cho Admin duyệt hồ sơ.

### 3.1. `PATCH /drivers/me/status` 🚗

```jsonc
// Request
{
  "isOnline": true,
  "latitude": 21.0285,      // BẮT BUỘC khi bật online (BR-26 điều kiện 5)
  "longitude": 105.8542
}

// 200 OK
{ "data": { "isOnline": true, "updatedAt": "2026-09-18T10:30:00.000Z" } }

// 403 ACCOUNT_NOT_APPROVED · 400 NO_ACTIVE_VEHICLE
// 403 WALLET_BELOW_THRESHOLD · 400 LOCATION_REQUIRED
// 409 ACTIVE_RIDE_EXISTS  (khi tắt online mà đang có chuyến dở dang — BR-30)
```

### 3.2. Giấy tờ lịch sử và gửi lại hồ sơ

```http
GET /drivers/me/documents
```

```json
{
  "data": [
    {
      "id": "uuid",
      "docType": "DRIVER_LICENSE",
      "fileUrl": "https://res.cloudinary.com/...",
      "verificationStatus": "REJECTED",
      "rejectReason": "Ảnh bị mờ",
      "uploadedAt": "2026-09-18T10:30:00.000Z",
      "verifiedAt": "2026-09-19T10:30:00.000Z"
    }
  ]
}
```

Cập nhật thông tin CCCD/GPLX bằng `PATCH /drivers/me`, sau đó gọi:

```http
POST /drivers/me/resubmit
```

Phản hồi `{ "data": { "approvalStatus": "PENDING" } }`. Nếu thiếu thông tin định danh, trả `400 IDENTITY_INFORMATION_INCOMPLETE`; nếu hồ sơ không ở trạng thái `REJECTED`, trả `409 INVALID_STATE_TRANSITION`.

### 3.3. `GET /drivers/me/stats` 🚗

```jsonc
// Query: ?from=2026-09-01&to=2026-09-18&groupBy=day

// 200 OK
{
  "data": {
    "summary": {
      "totalRides": 42,
      "totalFare": 1680000,
      "totalPlatformFee": 168000,
      "netEarning": 1512000,
      "cancelCount": 2,
      "acceptanceRate": 0.78,
    },
    "breakdown": [
      {
        "date": "2026-09-18",
        "rides": 5,
        "fare": 210000,
        "platformFee": 21000,
        "netEarning": 189000,
      },
    ],
  },
}
```

---

## 4. Quản trị tài xế — `/admin/drivers`

| #   | Method | Endpoint                     | Quyền | Chức năng                     |
| --- | ------ | ---------------------------- | ----- | ----------------------------- |
| 15  | GET    | `/admin/drivers`             | 🛡️    | Danh sách tài xế, có lọc      |
| 16  | GET    | `/admin/drivers/:id`         | 🛡️    | Chi tiết hồ sơ kèm giấy tờ    |
| 17  | POST   | `/admin/drivers/:id/approve` | 🛡️    | Duyệt hồ sơ                   |
| 18  | POST   | `/admin/drivers/:id/reject`  | 🛡️    | Từ chối hồ sơ                 |
| 19  | PATCH  | `/admin/drivers/:id/lock`    | 🛡️    | Khóa / mở khóa tài khoản      |
| 20  | GET    | `/admin/drivers/:id/rides`   | 🛡️    | Lịch sử chuyến của tài xế     |
| 21  | GET    | `/admin/drivers/online`      | 🛡️    | Tài xế đang online kèm vị trí |

### 4.1. `GET /admin/drivers` 🛡️

```
Query: ?approvalStatus=PENDING&isOnline=true&search=0912&page=1&limit=20
```

```jsonc
// 200 OK
{
  "data": [
    {
      "id": "3c6e0b8a-...",
      "fullName": "Nguyễn Văn An",
      "phoneNumber": "0912345678",
      "email": "taixe01@gmail.com",
      "approvalStatus": "PENDING",
      "isOnline": false,
      "vehicle": { "vehicleType": "MOTORBIKE", "licensePlate": "29X1-12345" },
      "walletBalance": 0,
      "totalRides": 0,
      "cancelCount": 0,
      "documentsCount": 4,
      "createdAt": "2026-09-18T08:00:00.000Z",
    },
  ],
  "meta": { "page": 1, "limit": 20, "total": 7, "totalPages": 1 },
}
```

### 4.2. `POST /admin/drivers/:id/approve` 🛡️

```jsonc
// Request — không có body

// 200 OK — thực hiện đầy đủ 5 tác dụng phụ của BR-19 trong một transaction
{
  "data": {
    "id": "3c6e0b8a-...",
    "approvalStatus": "APPROVED",
    "approvedAt": "2026-09-18T10:30:00.000Z",
    "walletCreated": true,
  },
}
```

### 4.3. `POST /admin/drivers/:id/reject` 🛡️

```jsonc
// Request
{ "reason": "Ảnh giấy phép lái xe bị mờ, không đọc được số hiệu" }

// 200 OK
{ "data": { "id": "...", "approvalStatus": "REJECTED",
            "rejectReason": "Ảnh giấy phép lái xe bị mờ, ..." } }

// 400 REJECT_REASON_REQUIRED  (thiếu lý do hoặc dưới 10 ký tự — BR-18)
```

---

## 5. Phương tiện — `/vehicles`

| #   | Method | Endpoint                     | Quyền | Chức năng                   |
| --- | ------ | ---------------------------- | ----- | --------------------------- |
| 22  | GET    | `/vehicles/me`               | ⏳    | Danh sách xe của tài xế     |
| 23  | POST   | `/vehicles`                  | ⏳    | Thêm xe mới                 |
| 24  | PATCH  | `/vehicles/:id`              | ⏳    | Sửa thông tin xe            |
| 25  | PATCH  | `/vehicles/:id/activate`     | 🚗    | Đặt xe này làm xe hoạt động |
| 26  | PATCH  | `/admin/vehicles/:id/verify` | 🛡️    | Duyệt / từ chối xe          |

> `PATCH /vehicles/:id/activate` tự động chuyển các xe khác của tài xế về `isActive = 0`
> trong cùng một transaction (BR-23).

---

## 6. Khách hàng — `/admin/customers`

| #   | Method | Endpoint               | Quyền | Chức năng                     |
| --- | ------ | ---------------------- | ----- | ----------------------------- |
| 27  | GET    | `/admin/customers`     | 🛡️    | Danh sách khách hàng mô phỏng |
| 28  | POST   | `/admin/customers`     | 🛡️    | Tạo khách hàng                |
| 29  | PATCH  | `/admin/customers/:id` | 🛡️    | Sửa thông tin khách           |
| 30  | DELETE | `/admin/customers/:id` | 🛡️    | Xóa khách chưa gắn chuyến nào |

---

## 7. Chuyến xe — `/rides`

| #   | Method | Endpoint                      | Quyền | Chức năng                              |
| --- | ------ | ----------------------------- | ----- | -------------------------------------- |
| 31  | POST   | `/admin/rides`                | 🛡️    | Admin tạo chuyến mô phỏng              |
| 32  | POST   | `/admin/rides/estimate`       | 🛡️    | Ước tính giá trước khi tạo             |
| 33  | GET    | `/admin/rides`                | 🛡️    | Danh sách chuyến, có lọc và phân trang |
| 34  | GET    | `/rides/:id`                  | 🚗    | Chi tiết chuyến của tài xế              |
| 35  | GET    | `/rides/:id/history`          | 🚗    | Nhật ký chuyển trạng thái của tài xế    |
| 36  | POST   | `/admin/rides/:id/cancel`     | 🛡️    | Admin hủy chuyến                       |
| 37  | POST   | `/admin/rides/:id/redispatch` | 🛡️    | Điều phối lại chuyến `NO_DRIVER_FOUND` |
| 38  | GET    | `/rides/offers`               | 🚗    | Lời mời đang chờ của tài xế            |
| 39  | POST   | `/rides/:id/view`             | 🚗    | Đánh dấu đã xem lời mời                |
| 40  | POST   | `/rides/:id/accept`           | 🚗    | **Nhận chuyến**                        |
| 41  | POST   | `/rides/:id/ignore`           | 🚗    | Bỏ qua lời mời                         |
| 42  | PATCH  | `/rides/:id/status`           | 🚗    | Cập nhật trạng thái chuyến             |
| 43  | POST   | `/rides/:id/cancel`           | 🚗    | Tài xế hủy chuyến                      |
| 44  | GET    | `/rides/me`                   | 🚗    | Lịch sử chuyến của tài xế              |
| 45  | GET    | `/rides/me/active`            | 🚗    | Chuyến đang thực hiện (nếu có)         |
| 61  | GET    | `/admin/rides/:id`             | 🛡️    | Chi tiết chuyến, lịch sử và lời mời    |

`GET /admin/rides` nhận `page`, `limit`, `status`, `from`, `to`, `search` (mã chuyến, tên/số điện thoại khách). `GET /admin/rides/:id` trả thông tin chuyến, khách, tài xế, xe, nhật ký trạng thái và danh sách lời mời.

`GET /rides/me` nhận `page`, `limit`, `status`, `from`, `to`; kết quả được sắp xếp theo `createdAt`. `GET /rides/me/active` trả chuyến ở trạng thái `ACCEPTED`, `ARRIVED` hoặc `IN_PROGRESS`, hoặc `null` nếu chưa có. Tài xế chỉ xem được chuyến mình sở hữu qua `GET /rides/:id` và `GET /rides/:id/history`; tài xế khác nhận `403 NOT_RIDE_OWNER`.

### 7.1. `POST /admin/rides/estimate` 🛡️

```jsonc
// Request
{ "vehicleType": "MOTORBIKE", "distanceKm": 7.5 }

// 200 OK — áp dụng công thức BR-36
{
  "data": {
    "estimatedFare": 34000,
    "breakdown": {
      "baseFare": 12000,
      "baseDistanceKm": 2,
      "extraDistanceKm": 5.5,
      "pricePerKm": 4000,
      "extraFare": 22000
    }
  }
}
```

### 7.2. `POST /admin/rides` 🛡️

```jsonc
// Request
{
  "customerId": "a1b2c3d4-...",
  "vehicleType": "MOTORBIKE",
  "pickupAddress": "Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội",
  "pickupLatitude": 21.0067,
  "pickupLongitude": 105.8431,
  "dropoffAddress": "Số 144 Xuân Thủy, Cầu Giấy, Hà Nội",
  "dropoffLatitude": 21.0367,
  "dropoffLongitude": 105.7826,
  "distanceKm": 7.5,
  "estimatedDurationMinutes": 25,
  "estimatedFare": null,          // null => hệ thống tự tính theo BR-36
  "paymentMethod": "CASH"
}

// 201 Created — điều phối nền bắt đầu sau commit; response không chờ các vòng gửi offer
{
  "data": {
    "id": "9f8e7d6c-...",
    "rideCode": "R20260918-0001",
    "status": "SEARCHING",
    "estimatedFare": 34000,
    "dispatchRound": 0,
    "offersSent": 0,
    "createdAt": "2026-09-18T10:30:00.000Z"
  }
}

// 400 FARE_OUT_OF_RANGE  (giá ghi đè ngoài khoảng 10.000đ – 5.000.000đ)
```

Điều phối được khởi chạy nền ngay sau khi transaction tạo chuyến commit thành công (BR-42).
Response ban đầu có thể trả về trước khi vòng gửi lời mời hoàn tất; Admin theo dõi trạng thái
qua danh sách chuyến realtime. `POST /admin/rides/:id/redispatch` chỉ dùng cho chuyến
`NO_DRIVER_FOUND`.

### 7.3. `GET /rides/offers` 🚗

```jsonc
// 200 OK — chỉ trả về lời mời còn hiệu lực
{
  "data": [
    {
      "offerId": "5a4b3c2d-...",
      "rideId": "9f8e7d6c-...",
      "rideCode": "R20260918-0001",
      "customerName": "Trần Thị Bình",
      "pickupAddress": "Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội",
      "pickupLatitude": 21.0067,
      "pickupLongitude": 105.8431,
      "dropoffAddress": "Số 144 Xuân Thủy, Cầu Giấy, Hà Nội",
      "dropoffLatitude": 21.0367,
      "dropoffLongitude": 105.7826,
      "distanceKm": 7.5,
      "distanceToPickupKm": 1.2,
      "estimatedFare": 34000,
      "estimatedEarning": 30600, // đã trừ phí nền tảng, giúp tài xế quyết định nhanh
      "paymentMethod": "CASH",
      "expiredAt": "2026-09-18T10:30:20.000Z",
      "remainingSeconds": 14,
    },
  ],
}
```

### 7.4. `POST /rides/:id/accept` 🚗 — **endpoint quan trọng nhất**

```jsonc
// Request — không có body

// 200 OK — tài xế thắng cuộc tranh chấp (BR-45)
{
  "data": {
    "id": "9f8e7d6c-...",
    "rideCode": "R20260918-0001",
    "status": "ACCEPTED",
    "acceptedAt": "2026-09-18T10:30:07.000Z",
    "customer": { "fullName": "Trần Thị Bình", "phoneNumber": "0987654321" },
    "vehicle": {
      "licensePlate": "29X1-12345",
      "brand": "Honda",
      "modelName": "Vision",
    },
    "pickupAddress": "Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội",
    "dropoffAddress": "Số 144 Xuân Thủy, Cầu Giấy, Hà Nội",
    "estimatedFare": 34000,
    "estimatedEarning": 30600,
  },
}

// 409 RIDE_ALREADY_TAKEN     — tài xế khác nhanh hơn
// 409 OFFER_EXPIRED          — lời mời đã hết hạn
// 409 ACTIVE_RIDE_EXISTS     — đang có chuyến khác chưa xong
// 403 WALLET_BELOW_THRESHOLD — ví âm vượt ngưỡng
```

**Luồng xử lý phía backend:**

```
1. Kiểm tra RideOffer tồn tại, thuộc về tài xế này, status IN ('SENT','VIEWED')
                                                      và expiredAt > NOW
2. Kiểm tra lại BR-40 điều kiện 5 và 7 (tài xế rảnh, ví đủ) — BR-47
3. Lấy vehicleId của xe đang hoạt động — BR-46
4. BEGIN TRANSACTION
     UPDATE Ride SET driverId=..., vehicleId=..., status='ACCEPTED',
                     acceptedAt=SYSUTCDATETIME()
     WHERE id=@rideId AND status='SEARCHING' AND driverId IS NULL

     @@ROWCOUNT = 0 -> ROLLBACK
                       UPDATE RideOffer SET status='LOST'
                       trả 409 RIDE_ALREADY_TAKEN

     UPDATE RideOffer SET status='ACCEPTED' WHERE id=@offerId
     UPDATE RideOffer SET status='LOST'
            WHERE rideId=@rideId AND id<>@offerId AND status IN ('SENT','VIEWED')
     INSERT RideStatusHistory (SEARCHING -> ACCEPTED)
   COMMIT
5. Phát sự kiện (ngoài transaction):
     ride:assigned    -> driver:{winnerId}
     ride:offer_taken -> các tài xế thua
     ride:status_changed -> room admin
```

### 7.5. `PATCH /rides/:id/status` 🚗

```jsonc
// Request
{ "status": "ARRIVED" }     // ARRIVED | IN_PROGRESS | COMPLETED

// 200 OK — khi COMPLETED thì phản hồi kèm số liệu quyết toán
{
  "data": {
    "id": "9f8e7d6c-...",
    "status": "COMPLETED",
    "completedAt": "2026-09-18T10:55:00.000Z",
    "settlement": {
      "finalFare": 34000,
      "commissionRate": 0.10,
      "platformFee": 3400,
      "driverEarning": 30600,
      "walletBalanceAfter": -3400,
      "note": "Khách trả tiền mặt. Phí nền tảng được trừ vào ví."
    }
  }
}

// 409 INVALID_STATE_TRANSITION — chuyển trạng thái không hợp lệ (BR-31)
// 403 NOT_RIDE_OWNER           — không phải tài xế của chuyến này
```

**Bảng ánh xạ trạng thái được phép gửi:**

| Trạng thái hiện tại | Giá trị `status` hợp lệ   |
| ------------------- | ------------------------- |
| `ACCEPTED`          | `ARRIVED`                 |
| `ARRIVED`           | `IN_PROGRESS`             |
| `IN_PROGRESS`       | `COMPLETED`               |
| Khác                | Không giá trị nào → `409` |

### 7.6. `POST /rides/:id/cancel` 🚗

```jsonc
// Request
{ "reason": "Xe bị thủng lốp, không thể tiếp tục" }

// 200 OK — chuyến quay về SEARCHING và được điều phối lại (BR-51)
{
  "data": {
    "rideId": "9f8e7d6c-...",
    "rideStatus": "SEARCHING",
    "redispatched": true,
    "message": "Chuyến đã được chuyển cho tài xế khác"
  }
}

// 409 CANNOT_CANCEL_IN_PROGRESS · 400 CANCEL_REASON_REQUIRED
```

### 7.7. `POST /admin/rides/:id/cancel` 🛡️

```jsonc
// Request
{ "reason": "Khách hàng báo hủy qua tổng đài" }

// 200 OK — chuyến kết thúc hẳn, KHÔNG điều phối lại
{ "data": { "id": "...", "status": "CANCELLED",
            "cancelledBy": "ADMIN",
            "cancelledAt": "2026-09-18T10:35:00.000Z" } }
```

---

## 8. Ví — `/wallet`

| #   | Method | Endpoint                   | Quyền | Chức năng                      |
| --- | ------ | -------------------------- | ----- | ------------------------------ |
| 46  | GET    | `/wallet`                  | 🚗    | Số dư ví hiện tại              |
| 47  | GET    | `/wallet/transactions`     | 🚗    | Lịch sử giao dịch              |
| 48  | POST   | `/wallet/topup`            | 🚗    | Tạo yêu cầu nạp tiền           |
| 49  | GET    | `/wallet/topup`            | 🚗    | Danh sách yêu cầu nạp của mình |
| 50  | GET    | `/admin/topup`             | 🛡️    | Yêu cầu nạp chờ duyệt          |
| 51  | POST   | `/admin/topup/:id/approve` | 🛡️    | Duyệt yêu cầu nạp              |
| 52  | POST   | `/admin/topup/:id/reject`  | 🛡️    | Từ chối yêu cầu nạp            |
| 53  | GET    | `/admin/wallet/platform`   | 🛡️    | Ví nền tảng và doanh thu       |

### 8.1. `GET /wallet` 🚗

```jsonc
// 200 OK
{
  "data": {
    "balance": -34000,
    "maxNegativeBalance": -200000,
    "availableMargin": 166000, // còn được nợ bao nhiêu trước khi bị chặn
    "isBlocked": false,
    "warningMessage": null,
    "updatedAt": "2026-09-18T10:55:00.000Z",
  },
}
```

### 8.2. `GET /wallet/transactions` 🚗

```
Query: ?type=COMMISSION_FEE&from=2026-09-01&page=1&limit=20
```

```jsonc
// 200 OK
{
  "data": [
    {
      "id": "7c8d9e0f-...",
      "type": "COMMISSION_FEE",
      "typeLabel": "Phí nền tảng",
      "direction": "DEBIT",
      "amount": 3400,
      "balanceAfter": -3400,
      "description": "Phí nền tảng 10% chuyến R20260918-0001",
      "ride": {
        "id": "9f8e7d6c-...",
        "rideCode": "R20260918-0001",
        "finalFare": 34000,
      },
      "createdAt": "2026-09-18T10:55:00.000Z",
    },
  ],
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 },
}
```

### 8.3. `GET /admin/wallet/platform` 🛡️

```jsonc
// 200 OK
{
  "data": {
    "balance": 1680000,
    "revenue": {
      "today": 45000,
      "thisWeek": 320000,
      "thisMonth": 1680000,
      "allTime": 1680000,
    },
    "ridesCompleted": { "today": 12, "thisMonth": 420 },
  },
}
```

---

## 9. Cấu hình hệ thống — `/admin/settings`

| #   | Method | Endpoint               | Quyền | Chức năng                |
| --- | ------ | ---------------------- | ----- | ------------------------ |
| 54  | GET    | `/admin/settings`      | 🛡️    | Toàn bộ tham số cấu hình |
| 55  | PATCH  | `/admin/settings/:key` | 🛡️    | Cập nhật một tham số     |

```jsonc
// PATCH /admin/settings/COMMISSION_RATE
{ "value": "0.15" }

// 200 OK
{
  "data": {
    "key": "COMMISSION_RATE",
    "value": "0.15",
    "previousValue": "0.10",
    "note": "Chỉ áp dụng cho các chuyến hoàn thành từ thời điểm này. Các chuyến đã hoàn thành giữ nguyên tỷ lệ đã ghi nhận."
  }
}
```

---

## 10. Thông báo — `/notifications`

| #   | Method | Endpoint                  | Quyền | Chức năng              |
| --- | ------ | ------------------------- | ----- | ---------------------- |
| 56  | GET    | `/notifications`          | 👤    | Danh sách thông báo    |
| 57  | PATCH  | `/notifications/:id/read` | 👤    | Đánh dấu đã đọc        |
| 58  | PATCH  | `/notifications/read-all` | 👤    | Đánh dấu tất cả đã đọc |

---

## 11. Dashboard Admin — `/admin/dashboard`

| #   | Method | Endpoint                          | Quyền | Chức năng                    |
| --- | ------ | --------------------------------- | ----- | ---------------------------- |
| 59  | GET    | `/admin/dashboard/summary`        | 🛡️    | Số liệu tổng quan            |
| 60  | GET    | `/admin/dashboard/dispatch-stats` | 🛡️    | Hiệu quả điều phối theo vòng |

```jsonc
// GET /admin/dashboard/summary
{
  "data": {
    "drivers": {
      "total": 25,
      "approved": 20,
      "pending": 4,
      "rejected": 1,
      "onlineNow": 7,
    },
    "rides": {
      "today": 12,
      "searching": 1,
      "inProgress": 3,
      "completedToday": 8,
      "cancelledToday": 1,
      "noDriverFound": 0,
    },
    "revenue": { "todayGmv": 450000, "todayPlatformFee": 45000 },
    "topup": { "pendingRequests": 2, "pendingAmount": 400000 },
  },
}
```

---

## 12. Sự kiện Socket.IO

### 12.1. Thiết lập kết nối

```
URL:       ws://localhost:3000
Namespace: /  (mặc định)
Auth:      { token: "<accessToken>" }   trong handshake
```

Kết nối không có token hoặc token sai sẽ bị **ngắt ngay lập tức**.

### 12.2. Room tự động tham gia

| Vai trò  | Room                |
| -------- | ------------------- |
| `DRIVER` | `driver:{driverId}` |
| `ADMIN`  | `admin`             |

### 12.3. Client → Server

| Sự kiện            | Người gửi | Dữ liệu                                     | Ý nghĩa                                   |
| ------------------ | --------- | ------------------------------------------- | ----------------------------------------- |
| `driver:location`  | Tài xế    | `{ latitude, longitude, heading?, speed? }` | Gửi vị trí mỗi 30 giây khi online (BR-27) |
| `driver:heartbeat` | Tài xế    | `{}`                                        | Báo còn sống, mỗi 60 giây                 |
| `offer:viewed`     | Tài xế    | `{ offerId }`                               | Đã mở xem chi tiết lời mời                |
| `ride:subscribe`   | Cả hai    | `{ rideId }`                                | Tham gia room `ride:{rideId}`             |
| `ride:unsubscribe` | Cả hai    | `{ rideId }`                                | Rời room                                  |

### 12.4. Server → Tài xế

| Sự kiện                | Dữ liệu                                             | Khi nào                                              |
| ---------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| `ride:offer`           | Toàn bộ object lời mời (như `GET /rides/offers`)    | Hệ thống gửi chuyến tới tài xế này                   |
| `ride:offer_expired`   | `{ offerId, rideId }`                               | Hết thời gian chờ (BR-42 bước 6)                     |
| `ride:offer_taken`     | `{ offerId, rideId }`                               | Tài xế khác đã nhận — gỡ lời mời khỏi màn hình       |
| `ride:assigned`        | Object chuyến đầy đủ                                | Tài xế này nhận chuyến thành công                    |
| `ride:cancelled`       | `{ rideId, cancelledBy, reason }`                   | Admin hủy chuyến đang thực hiện                      |
| `wallet:updated`       | `{ balance, change, type, description, isBlocked }` | Số dư ví thay đổi                                    |
| `driver:approved`      | `{ approvalStatus, approvedAt }`                    | Hồ sơ được duyệt                                     |
| `driver:rejected`      | `{ approvalStatus, rejectReason }`                  | Hồ sơ bị từ chối                                     |
| `driver:force_offline` | `{ reason }`                                        | Bị ép offline (ví âm vượt ngưỡng, tài khoản bị khóa) |

### 12.5. Server → Admin

| Sự kiện                   | Dữ liệu                                                                  | Khi nào                                            |
| ------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| `ride:created`            | Object chuyến tóm tắt                                                    | Chuyến mới được tạo                                |
| `ride:status_changed`     | `{ rideId, rideCode, fromStatus, toStatus, driverId?, driverName?, at }` | Chuyến đổi trạng thái                              |
| `ride:no_driver_found`    | `{ rideId, rideCode, roundsTried }`                                      | Hết vòng điều phối, không ai nhận                  |
| `dispatch:round_started`  | `{ rideId, round, driversNotified }`                                     | Bắt đầu một vòng điều phối                         |
| `driver:status_changed`   | `{ driverId, fullName, isOnline, latitude?, longitude? }`                | Tài xế bật / tắt online                            |
| `driver:location_updated` | `{ driverId, latitude, longitude, at }`                                  | Vị trí tài xế thay đổi (để vẽ lên bản đồ giám sát) |
| `topup:requested`         | `{ requestId, driverName, amount }`                                      | Có yêu cầu nạp tiền mới                            |

### 12.6. Ví dụ tích hợp phía Flutter

```dart
class SocketService {
  late IO.Socket _socket;

  void connect(String accessToken) {
    _socket = IO.io(AppConfig.baseUrl, IO.OptionBuilder()
        .setTransports(['websocket'])
        .disableAutoConnect()
        .setAuth({'token': accessToken})
        .setReconnectionAttempts(999)
        .setReconnectionDelay(2000)
        .build());

    _socket.onConnect((_) => debugPrint('Socket đã kết nối'));

    _socket.on('ride:offer', (data) {
      final offer = RideOffer.fromJson(data);
      _offerController.add(offer);
      NotificationService.showRideOffer(offer);   // rung + âm thanh
    });

    _socket.on('ride:offer_taken', (data) {
      _offerController.remove(data['offerId']);   // gỡ khỏi màn hình
    });

    _socket.on('wallet:updated', (data) {
      _walletController.add(Wallet.fromJson(data));
    });

    _socket.connect();
  }

  void sendLocation(double lat, double lng) {
    _socket.emit('driver:location', {'latitude': lat, 'longitude': lng});
  }
}
```

---

## 13. Tổng hợp số lượng endpoint

| Nhóm            | Số lượng                            |
| --------------- | ----------------------------------- |
| Xác thực        | 6                                   |
| Hồ sơ tài xế    | 8                                   |
| Quản trị tài xế | 7                                   |
| Phương tiện     | 5                                   |
| Khách hàng      | 4                                   |
| Chuyến xe       | 16                                  |
| Ví và nạp tiền  | 8                                   |
| Cấu hình        | 2                                   |
| Thông báo       | 3                                   |
| Dashboard       | 2                                   |
| **Tổng cộng**   | **61 endpoint + 16 sự kiện Socket** |
