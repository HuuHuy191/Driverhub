# BUSINESS RULES — Quy tắc nghiệp vụ

> **Đây là tài liệu quan trọng nhất của dự án.** Mọi quy tắc đều có mã định danh
> (`BR-xx`) để mã nguồn, test và báo cáo cùng tham chiếu.
>
> Nguyên tắc bao trùm: **mọi quy tắc nghiệp vụ được thực thi ở Backend.**
> Client (Flutter / React) chỉ hiển thị và chặn sớm cho thân thiện người dùng — không bao
> giờ được coi là lớp bảo vệ.

---

## Mục lục

1. [Cấu hình hệ thống](#1-cấu-hình-hệ-thống)
2. [Tài khoản, đăng ký và xác thực](#2-tài-khoản-đăng-ký-và-xác-thực)
3. [Hồ sơ tài xế và phê duyệt](#3-hồ-sơ-tài-xế-và-phê-duyệt)
4. [Phương tiện](#4-phương-tiện)
5. [Trạng thái hoạt động của tài xế](#5-trạng-thái-hoạt-động-của-tài-xế)
6. [Máy trạng thái chuyến xe](#6-máy-trạng-thái-chuyến-xe)
7. [Tính giá cước](#7-tính-giá-cước)
8. [Thuật toán điều phối](#8-thuật-toán-điều-phối)
9. [Nhận chuyến và xử lý tranh chấp đồng thời](#9-nhận-chuyến-và-xử-lý-tranh-chấp-đồng-thời)
10. [Hủy chuyến](#10-hủy-chuyến)
11. [Ví và quyết toán tài chính](#11-ví-và-quyết-toán-tài-chính)
12. [Nạp tiền vào ví](#12-nạp-tiền-vào-ví)
13. [Thông báo](#13-thông-báo)
14. [Bảng tổng hợp mã lỗi nghiệp vụ](#14-bảng-tổng-hợp-mã-lỗi-nghiệp-vụ)

---

## 1. Cấu hình hệ thống

**BR-01 — Không hardcode tham số nghiệp vụ.**
Mọi con số mang tính chính sách phải đọc từ bảng `SystemConfig`, không được viết cứng
trong mã nguồn. Điều này cho phép thay đổi chính sách mà không phải build lại.

| Khóa                          | Giá trị mặc định | Ý nghĩa                                                    |
| ----------------------------- | ---------------- | ---------------------------------------------------------- |
| `COMMISSION_RATE`             | `0.10`           | Tỷ lệ phí nền tảng (10%)                                   |
| `OFFER_TIMEOUT_SECONDS`       | `20`             | Thời gian chờ tài xế phản hồi một lời mời                  |
| `DISPATCH_BATCH_SIZE`         | `5`              | Số tài xế được gửi lời mời trong mỗi vòng                  |
| `DISPATCH_MAX_ROUNDS`         | `3`              | Số vòng điều phối tối đa                                   |
| `DISPATCH_RADIUS_KM`          | `10`             | Bán kính tìm tài xế quanh điểm đón                         |
| `MAX_NEGATIVE_BALANCE`        | `-200000`        | Ngưỡng ví âm tối đa (VNĐ)                                  |
| `LOCATION_STALE_MINUTES`      | `5`              | Vị trí cũ hơn mốc này bị coi là không hợp lệ khi điều phối |
| `FARE_BASE_MOTORBIKE`         | `12000`          | Giá mở cửa xe máy (2 km đầu)                               |
| `FARE_PER_KM_MOTORBIKE`       | `4000`           | Đơn giá mỗi km tiếp theo — xe máy                          |
| `FARE_BASE_CAR`               | `25000`          | Giá mở cửa ô tô (2 km đầu)                                 |
| `FARE_PER_KM_CAR`             | `9000`           | Đơn giá mỗi km tiếp theo — ô tô                            |
| `FARE_BASE_DISTANCE_KM`       | `2`              | Số km đã bao gồm trong giá mở cửa                          |

**BR-02 — Cache cấu hình.**
`SettingsService` nạp toàn bộ `SystemConfig` vào bộ nhớ khi khởi động và làm mới sau mỗi
60 giây hoặc ngay khi Admin cập nhật. Không truy vấn CSDL cho từng lần đọc cấu hình.

---

## 2. Tài khoản, đăng ký và xác thực

### 2.1. Đăng ký tài xế

**BR-03 — Đăng ký tài xế không yêu cầu xác minh OTP hoặc tải ảnh giấy tờ.** Tài xế gửi
email, mật khẩu, thông tin cá nhân, số CCCD/ngày cấp, thông tin xe và mã số giấy phép
lái xe/ngày cấp. Admin kiểm tra thủ công trước khi duyệt. Hệ thống tạo
`User(status=PENDING)` và `DriverProfile(approvalStatus=PENDING)` khi dữ liệu hợp lệ.

**BR-04 — Email là định danh duy nhất.** Một email chỉ gắn với đúng một tài khoản.
Nếu email đã tồn tại, đăng ký bị từ chối bằng `EMAIL_ALREADY_EXISTS`.

**BR-05 — Số điện thoại tài xế là duy nhất** trên toàn hệ thống.

**BR-06 — Mật khẩu** tối thiểu 8 ký tự, có ít nhất một chữ cái và một chữ số. Được băm
bằng `bcrypt` với cost factor 10. **Không bao giờ** lưu hoặc ghi log mật khẩu gốc.

**BR-07 — Tài khoản mới chưa được dùng.** Sau khi nộp hồ sơ, tài xế đăng nhập được nhưng
chỉ truy cập được màn hình "Chờ duyệt". Mọi API nghiệp vụ trả `403 ACCOUNT_NOT_APPROVED`.

### 2.2. Đăng nhập và phiên làm việc

**BR-11 — Điều kiện đăng nhập thành công:** email tồn tại **và** mật khẩu đúng **và**
`User.status <> 'LOCKED'`. Sai email hoặc sai mật khẩu đều trả về **cùng một thông báo**
`INVALID_CREDENTIALS` — không cho biết email có tồn tại hay không.

**BR-12 — Cặp token:**

| Token              | Thời gian sống | Nơi lưu                                                   |
| ------------------ | -------------- | --------------------------------------------------------- |
| Access token (JWT) | 15 phút        | Bộ nhớ ứng dụng                                           |
| Refresh token      | 30 ngày        | `flutter_secure_storage` (mobile) / httpOnly cookie (web) |

Refresh token được **băm** trước khi lưu vào bảng `RefreshToken`.

**BR-13 — Xoay vòng refresh token (rotation).** Mỗi lần gọi `/auth/refresh`, token cũ bị
thu hồi và cấp token mới. Nếu một refresh token đã thu hồi được dùng lại → nghi ngờ bị
đánh cắp → **thu hồi toàn bộ** refresh token của tài khoản đó, buộc đăng nhập lại.

**BR-14 — Đăng xuất** thu hồi refresh token của thiết bị hiện tại và xóa `fcmToken` tương ứng.

### 2.3. Thay đổi mật khẩu

**BR-15 — Đổi mật khẩu khi đã đăng nhập.** Tài xế phải cung cấp mật khẩu hiện tại và
mật khẩu mới hợp lệ theo BR-06. Sau khi đổi mật khẩu thành công, **thu hồi toàn bộ
refresh token** của tài khoản.

---

## 3. Hồ sơ tài xế và phê duyệt

**BR-16 — Thông tin định danh bắt buộc.** Hồ sơ đăng ký phải có đủ số CCCD, ngày cấp
CCCD, mã số giấy phép lái xe và ngày cấp giấy phép lái xe. Không yêu cầu tải ảnh giấy tờ;
Admin kiểm tra các thông tin này thủ công.

**BR-17 — Máy trạng thái phê duyệt hồ sơ:**

```
PENDING ──(Admin duyệt)──> APPROVED
   │
   └────(Admin từ chối, bắt buộc có lý do)──> REJECTED
                                                  │
                              (tài xế cập nhật thông tin và gửi lại)
                                                  │
                                                  v
                                               PENDING
```

**BR-18 — Từ chối phải có lý do.** `rejectReason` là bắt buộc khi chuyển sang `REJECTED`,
tối thiểu 10 ký tự. Lý do được hiển thị nguyên văn cho tài xế.

**BR-19 — Tác dụng phụ khi duyệt (chạy trong một transaction):**

1. `DriverProfile.approvalStatus = 'APPROVED'`, ghi `approvedAt`, `approvedBy`.
2. `User.status = 'ACTIVE'`.
3. Tất cả `Vehicle` của tài xế → `verificationStatus = 'APPROVED'`.
4. **Tạo `Wallet` cho tài xế với `balance = 0`** nếu chưa có.
5. Gửi thông báo cho tài xế.

> Bước 4 rất quan trọng: ví phải tồn tại **trước** khi tài xế có thể nhận chuyến đầu tiên.

**BR-20 — Phân tách trách nhiệm giữa hai cột trạng thái.** Đây là điểm dễ nhầm:

| Cột                            | Trách nhiệm                        | Giá trị                           |
| ------------------------------ | ---------------------------------- | --------------------------------- |
| `User.status`                  | Trạng thái **tài khoản đăng nhập** | `PENDING`, `ACTIVE`, `LOCKED`     |
| `DriverProfile.approvalStatus` | Trạng thái **duyệt hồ sơ đối tác** | `PENDING`, `APPROVED`, `REJECTED` |

`DriverProfile.approvalStatus` là **nguồn sự thật duy nhất** cho việc "tài xế đã được duyệt
chưa". `User.status` chỉ quyết định "tài khoản có bị khóa không". Không suy diễn cột này
từ cột kia.

**BR-21 — Khóa tài khoản.** Admin có thể đặt `User.status = 'LOCKED'`. Khi đó tài xế không
đăng nhập được, toàn bộ refresh token bị thu hồi, và nếu đang online thì bị ép offline.
Nếu tài xế đang có chuyến dở dang thì **không cho khóa** — phải xử lý xong chuyến trước.

---

## 4. Phương tiện

**BR-22 — Biển số xe là duy nhất** trên toàn hệ thống.

**BR-23 — Mỗi tài xế chỉ có đúng một xe đang hoạt động.** Ràng buộc này được thực thi ở
tầng CSDL bằng filtered unique index:

```sql
CREATE UNIQUE INDEX UX_Vehicle_ActivePerDriver
ON Vehicle(driverId) WHERE isActive = 1;
```

Khi tài xế đặt một xe khác thành hoạt động, xe cũ tự động chuyển `isActive = 0` trong
cùng một transaction.

**BR-24 — Xe phải được duyệt.** Chỉ xe có `verificationStatus = 'APPROVED'` và
`isActive = 1` mới được gán vào chuyến.

**BR-25 — Loại xe phải khớp.** Chuyến có `vehicleType = 'CAR'` chỉ gửi cho tài xế có xe
hoạt động là ô tô. Tương tự với `MOTORBIKE`.

---

## 5. Trạng thái hoạt động của tài xế

**BR-26 — Điều kiện để bật ONLINE.** Tài xế chỉ bật được trạng thái sẵn sàng khi thỏa
**tất cả**:

| #   | Điều kiện                                                             | Mã lỗi nếu vi phạm       |
| --- | --------------------------------------------------------------------- | ------------------------ |
| 1   | `DriverProfile.approvalStatus = 'APPROVED'`                           | `ACCOUNT_NOT_APPROVED`   |
| 2   | `User.status = 'ACTIVE'`                                              | `ACCOUNT_LOCKED`         |
| 3   | Có ít nhất một xe `isActive = 1` và `verificationStatus = 'APPROVED'` | `NO_ACTIVE_VEHICLE`      |
| 4   | `Wallet.balance >= MAX_NEGATIVE_BALANCE`                              | `WALLET_BELOW_THRESHOLD` |
| 5   | Ứng dụng đã cấp quyền vị trí và gửi kèm tọa độ hiện tại               | `LOCATION_REQUIRED`      |

**BR-27 — Cập nhật vị trí.** Khi online, ứng dụng gửi vị trí mỗi 30 giây qua sự kiện
Socket `driver:location`. Backend ghi vào `currentLatitude`, `currentLongitude`,
`lastLocationUpdatedAt`.

**BR-28 — Vị trí quá cũ bị loại khỏi điều phối.** Tài xế có
`lastLocationUpdatedAt` cũ hơn `LOCATION_STALE_MINUTES` sẽ không được xét điều phối, dù
`isOnline = 1`. Quy tắc này xử lý trường hợp ứng dụng bị tắt đột ngột mà chưa kịp báo offline.

**BR-29 — Mất kết nối Socket không tự động đặt offline.** Khi socket ngắt, backend giữ
nguyên `isOnline` (mạng di động chập chờn là bình thường). Việc loại tài xế khỏi điều phối
do BR-28 đảm nhiệm.

**BR-30 — Không được tắt ONLINE khi đang có chuyến dở dang.** Trả `409 ACTIVE_RIDE_EXISTS`.

---

## 6. Máy trạng thái chuyến xe

### 6.1. Danh sách trạng thái

| Trạng thái        | Ý nghĩa                           | Ai gây ra      |
| ----------------- | --------------------------------- | -------------- |
| `SEARCHING`       | Chuyến vừa tạo, đang tìm tài xế   | Admin          |
| `ACCEPTED`        | Một tài xế đã nhận chuyến         | Tài xế         |
| `ARRIVED`         | Tài xế đã tới điểm đón            | Tài xế         |
| `IN_PROGRESS`     | Đang chở khách                    | Tài xế         |
| `COMPLETED`       | Hoàn thành, đã quyết toán ví      | Tài xế         |
| `CANCELLED`       | Bị hủy                            | Admin / Tài xế |
| `NO_DRIVER_FOUND` | Hết vòng điều phối, không ai nhận | Hệ thống       |

### 6.2. Bảng chuyển trạng thái hợp lệ

```
                    ┌──────────────────────────────┐
                    │          SEARCHING           │
                    └───┬───────────┬───────────┬──┘
         (tài xế nhận)  │           │           │  (hết 3 vòng)
                        v           │           v
                 ┌────────────┐     │   ┌───────────────────┐
                 │  ACCEPTED  │     │   │  NO_DRIVER_FOUND  │ [kết thúc]
                 └─────┬──────┘     │   └───────────────────┘
       (tài xế tới nơi)│            │ (Admin hủy)
                       v            │
                 ┌────────────┐     │
                 │  ARRIVED   │     │
                 └─────┬──────┘     │
        (bắt đầu chở)  │            │
                       v            │
                 ┌──────────────┐   │
                 │ IN_PROGRESS  │   │
                 └─────┬────────┘   │
          (hoàn thành) │            │
                       v            v
                 ┌────────────┐  ┌────────────┐
                 │ COMPLETED  │  │ CANCELLED  │  [kết thúc]
                 └────────────┘  └────────────┘
```

| Từ trạng thái     | Được chuyển sang  | Ai được phép                                |
| ----------------- | ----------------- | ------------------------------------------- |
| `SEARCHING`       | `ACCEPTED`        | Tài xế                                      |
| `SEARCHING`       | `CANCELLED`       | Admin                                       |
| `SEARCHING`       | `NO_DRIVER_FOUND` | Hệ thống                                    |
| `ACCEPTED`        | `ARRIVED`         | Tài xế được gán                             |
| `ACCEPTED`        | `CANCELLED`       | Admin hoặc tài xế được gán                  |
| `ACCEPTED`        | `SEARCHING`       | Hệ thống (khi tài xế hủy — xem BR-45)       |
| `ARRIVED`         | `IN_PROGRESS`     | Tài xế được gán                             |
| `ARRIVED`         | `CANCELLED`       | Admin hoặc tài xế được gán                  |
| `ARRIVED`         | `SEARCHING`       | Hệ thống (khi tài xế hủy — xem BR-45)       |
| `IN_PROGRESS`     | `COMPLETED`       | Tài xế được gán                             |
| `COMPLETED`       | —                 | Trạng thái kết thúc, **không đổi được nữa** |
| `CANCELLED`       | —                 | Trạng thái kết thúc                         |
| `NO_DRIVER_FOUND` | —                 | Trạng thái kết thúc                         |

**BR-31 — Không cho nhảy cóc.** Mọi chuyển trạng thái không có trong bảng trên đều bị từ
chối với `409 INVALID_STATE_TRANSITION`. Ví dụ `ACCEPTED → COMPLETED` là bất hợp lệ.

**BR-32 — Kiểm tra quyền sở hữu.** Chỉ tài xế có `Ride.driverId` bằng chính mình mới được
cập nhật trạng thái chuyến đó. Tài xế khác nhận `403 NOT_RIDE_OWNER`.

**BR-33 — Chuyển trạng thái phải là thao tác nguyên tử có điều kiện.**
Luôn dùng `UPDATE ... WHERE id = @id AND status = @expectedStatus`. Nếu
`@@ROWCOUNT = 0` nghĩa là trạng thái đã thay đổi bởi một request khác → trả `409`.
**Tuyệt đối không** đọc trạng thái ra rồi mới ghi đè — đó là lỗ hổng race condition kinh điển.

**BR-34 — Ghi nhật ký chuyển trạng thái.** Mỗi lần đổi trạng thái thành công, chèn một
bản ghi vào `RideStatusHistory` trong cùng transaction, gồm trạng thái cũ, trạng thái mới,
người thực hiện và thời điểm.

**BR-35 — Mốc thời gian.** Mỗi trạng thái ghi đúng một cột thời gian tương ứng:
`acceptedAt`, `arrivedAt`, `startedAt`, `completedAt`, `cancelledAt`. Các cột này chỉ được
ghi **một lần**, không ghi đè.

---

## 7. Tính giá cước

**BR-36 — Công thức tính giá dự kiến:**

```
Nếu distanceKm <= FARE_BASE_DISTANCE_KM:
    estimatedFare = baseFare
Ngược lại:
    estimatedFare = baseFare + (distanceKm - FARE_BASE_DISTANCE_KM) * pricePerKm

Trong đó baseFare và pricePerKm phụ thuộc vehicleType:
    MOTORBIKE -> FARE_BASE_MOTORBIKE (12.000đ), FARE_PER_KM_MOTORBIKE (4.000đ)
    CAR       -> FARE_BASE_CAR       (25.000đ), FARE_PER_KM_CAR       (9.000đ)

Kết quả được làm tròn lên bội số 1.000đ.
```

**Ví dụ:** chuyến xe máy 7,5 km

```
estimatedFare = 12.000 + (7,5 - 2) x 4.000 = 12.000 + 22.000 = 34.000đ
```

**BR-37 — Admin được ghi đè giá.** Khi tạo chuyến, Admin có thể nhập `estimatedFare` thủ
công để mô phỏng các tình huống đặc biệt. Nếu để trống, hệ thống tự tính theo BR-36.
Giá ghi đè phải nằm trong khoảng 10.000đ – 5.000.000đ.

**BR-38 — Quan hệ giữa `estimatedFare` và `finalFare`.**
`finalFare` là giá **chốt** tại thời điểm hoàn thành chuyến và là cơ sở duy nhất để tính
tiền. Ở phạm vi đồ án, `finalFare = estimatedFare` (giá không đổi). Cột được tách riêng để
sau này mở rộng các tình huống phụ thu (chờ lâu, đổi điểm đến) mà không phá vỡ dữ liệu cũ.

**BR-39 — Đơn vị tiền tệ.** Toàn hệ thống dùng **VNĐ, số nguyên**, kiểu `decimal(18,0)`.
Không dùng số thực dấu phẩy động cho tiền. Không có đơn vị nhỏ hơn đồng.

---

## 8. Thuật toán điều phối

### 8.1. Điều kiện để một tài xế đủ tư cách nhận lời mời

**BR-40 — Bộ lọc tài xế.** Tài xế được xét khi thỏa **tất cả** điều kiện:

| #   | Điều kiện                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | `approvalStatus = 'APPROVED'`                                                                                               |
| 2   | `User.status = 'ACTIVE'`                                                                                                    |
| 3   | `isOnline = 1`                                                                                                              |
| 4   | `lastLocationUpdatedAt >= NOW - LOCATION_STALE_MINUTES` (BR-28)                                                             |
| 5   | **Không đang có chuyến dở dang** — không tồn tại `Ride` nào của tài xế với `status IN ('ACCEPTED','ARRIVED','IN_PROGRESS')` |
| 6   | Có xe `isActive = 1`, `verificationStatus = 'APPROVED'`, `vehicleType` khớp yêu cầu chuyến                                  |
| 7   | `Wallet.balance >= MAX_NEGATIVE_BALANCE`                                                                                    |
| 8   | Chưa từng nhận lời mời của chính chuyến này (không tồn tại `RideOffer` với cặp `rideId + driverId`)                         |
| 9   | Khoảng cách tới điểm đón `<= DISPATCH_RADIUS_KM`                                                                            |

**BR-41 — Sắp xếp theo khoảng cách tăng dần**, lấy `DISPATCH_BATCH_SIZE` tài xế đầu tiên.

Truy vấn tận dụng kiểu `geography` của SQL Server:

```sql
SELECT TOP (@batchSize) dp.id, dp.fullName,
       geography::Point(dp.currentLatitude, dp.currentLongitude, 4326)
         .STDistance(geography::Point(@pickupLat, @pickupLng, 4326)) / 1000.0 AS distanceKm
FROM DriverProfile dp
INNER JOIN [User] u  ON u.id = dp.userId
INNER JOIN Vehicle v ON v.driverId = dp.id AND v.isActive = 1
                    AND v.verificationStatus = 'APPROVED'
                    AND v.vehicleType = @vehicleType
INNER JOIN Wallet w  ON w.userId = u.id
WHERE dp.approvalStatus = 'APPROVED'
  AND u.status = 'ACTIVE'
  AND dp.isOnline = 1
  AND dp.lastLocationUpdatedAt >= DATEADD(MINUTE, -@staleMinutes, SYSUTCDATETIME())
  AND w.balance >= @maxNegativeBalance
  AND NOT EXISTS (
        SELECT 1 FROM Ride r
        WHERE r.driverId = dp.id
          AND r.status IN ('ACCEPTED','ARRIVED','IN_PROGRESS'))
  AND NOT EXISTS (
        SELECT 1 FROM RideOffer o
        WHERE o.rideId = @rideId AND o.driverId = dp.id)
  AND geography::Point(dp.currentLatitude, dp.currentLongitude, 4326)
        .STDistance(geography::Point(@pickupLat, @pickupLng, 4326)) <= @radiusKm * 1000
ORDER BY distanceKm ASC;
```

### 8.2. Điều phối theo vòng

**BR-42 — Quy trình điều phối:**

```
round = 1
LẶP khi round <= DISPATCH_MAX_ROUNDS:
    1. Lấy danh sách tài xế đủ điều kiện (BR-40, BR-41)
    2. NẾU danh sách rỗng:
           NẾU round == 1 -> đặt chuyến = NO_DRIVER_FOUND, thoát
           NGƯỢC LẠI      -> chờ hết OFFER_TIMEOUT_SECONDS rồi thoát vòng lặp
    3. Với mỗi tài xế:
           - Tạo RideOffer(status='SENT', offeredAt=now,
                           expiredAt=now + OFFER_TIMEOUT_SECONDS, round=round)
           - Gửi sự kiện Socket "ride:offer" tới room driver:{id}
           - Gửi thông báo đẩy FCM (phòng khi app đang chạy nền)
    4. Chờ OFFER_TIMEOUT_SECONDS
    5. NẾU Ride.status != 'SEARCHING' -> đã có người nhận, thoát
    6. Đánh dấu các offer vòng này còn 'SENT'/'VIEWED' thành 'EXPIRED'
       + gửi sự kiện "ride:offer_expired" để app gỡ lời mời khỏi màn hình
    7. round = round + 1

SAU VÒNG LẶP:
    NẾU Ride.status vẫn == 'SEARCHING':
        đặt NO_DRIVER_FOUND + thông báo Admin
```

**BR-43 — Job quét lời mời hết hạn.** Một tác vụ định kỳ chạy mỗi 5 giây (`@nestjs/schedule`)
quét các `RideOffer` có `expiredAt < NOW` và `status IN ('SENT','VIEWED')`, chuyển sang
`EXPIRED`. Đây là lưới an toàn cho trường hợp tiến trình điều phối bị gián đoạn.

**BR-44 — Một chuyến không bao giờ gửi lặp cho cùng một tài xế.** Được đảm bảo bởi điều
kiện 8 của BR-40 **và** ràng buộc duy nhất ở tầng CSDL:

```sql
CONSTRAINT UQ_RideOffer_Ride_Driver UNIQUE (rideId, driverId)
```

### 8.3. Trạng thái lời mời

| Trạng thái | Ý nghĩa                                       |
| ---------- | --------------------------------------------- |
| `SENT`     | Đã gửi tới tài xế, đang chờ phản hồi          |
| `VIEWED`   | Tài xế đã mở xem chi tiết chuyến              |
| `ACCEPTED` | Tài xế bấm nhận và thắng cuộc tranh chấp      |
| `IGNORED`  | Tài xế chủ động bấm bỏ qua                    |
| `EXPIRED`  | Hết thời gian chờ mà không phản hồi           |
| `LOST`     | Tài xế có bấm nhận nhưng người khác nhanh hơn |

---

## 9. Nhận chuyến và xử lý tranh chấp đồng thời

**BR-45 — Đây là quy tắc kỹ thuật cốt lõi của đề tài.**

Khi nhiều tài xế bấm nhận cùng một chuyến trong cùng một khoảnh khắc, hệ thống phải đảm
bảo **đúng một người thắng**. Giải pháp: **optimistic concurrency** — đưa điều kiện kiểm
tra vào chính mệnh đề `WHERE` của câu `UPDATE`, để cơ sở dữ liệu tự phân xử.

```sql
-- Bên trong một transaction
UPDATE Ride
SET    driverId   = @driverId,
       vehicleId  = @vehicleId,
       status     = 'ACCEPTED',
       acceptedAt = SYSUTCDATETIME()
WHERE  id       = @rideId
  AND  status   = 'SEARCHING'      -- điều kiện quyết định
  AND  driverId IS NULL;           -- chốt chặn thứ hai

-- @@ROWCOUNT = 1  ->  tài xế này thắng
-- @@ROWCOUNT = 0  ->  chuyến đã bị người khác nhận
```

> **Vì sao cách "đọc rồi ghi" là sai:**
>
> ```
> Tài xế A: SELECT status -> 'SEARCHING'  ┐
> Tài xế B: SELECT status -> 'SEARCHING'  ┘  cả hai đều thấy chuyến còn trống
> Tài xế A: UPDATE ... SET driverId = A   -> thành công
> Tài xế B: UPDATE ... SET driverId = B   -> ghi đè lên A, cả hai đều tưởng mình thắng
> ```
>
> Đưa điều kiện vào `WHERE` loại bỏ hoàn toàn khoảng trống giữa hai thao tác, vì
> SQL Server giữ khóa dòng trong suốt câu lệnh `UPDATE`.

**Xử lý sau khi phân xử:**

| Kết quả                      | Hành động                                                                                                                                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Thắng** (`@@ROWCOUNT = 1`) | Cập nhật `RideOffer` của người thắng → `ACCEPTED`; cập nhật toàn bộ offer còn lại của chuyến → `LOST`; ghi `RideStatusHistory`; commit; phát sự kiện `ride:assigned` cho người thắng, `ride:offer_taken` cho những người còn lại, `ride:status_changed` cho Admin |
| **Thua** (`@@ROWCOUNT = 0`)  | Rollback; cập nhật `RideOffer` của người này → `LOST`; trả `409 RIDE_ALREADY_TAKEN` kèm thông điệp thân thiện _"Chuyến đã có tài xế khác nhận"_                                                                                                                   |

**BR-46 — Xe được gán tự động.** `vehicleId` lấy từ xe đang hoạt động của tài xế tại thời
điểm nhận chuyến (BR-23 đảm bảo chỉ có một). Tài xế không cần chọn.

**BR-47 — Kiểm tra trước khi cho bấm nhận.** Trước khi chạy câu `UPDATE` trên, backend
kiểm tra lại BR-40 điều kiện 5 và 7 (tài xế không bận, ví không âm quá ngưỡng). Lời mời có
thể đã gửi từ 15 giây trước và tình trạng tài xế đã thay đổi.

---

## 10. Hủy chuyến

**BR-48 — Ai được hủy, ở giai đoạn nào:**

| Trạng thái          | Admin | Tài xế            |
| ------------------- | ----- | ----------------- |
| `SEARCHING`         | ✅    | — (chưa được gán) |
| `ACCEPTED`          | ✅    | ✅                |
| `ARRIVED`           | ✅    | ✅                |
| `IN_PROGRESS`       | ❌    | ❌                |
| Trạng thái kết thúc | ❌    | ❌                |

**BR-49 — Không hủy được khi đang chở khách.** Từ `IN_PROGRESS` chỉ có một lối ra duy nhất
là `COMPLETED`. Khách đã lên xe thì chuyến phải được kết thúc đàng hoàng. Trả
`409 CANNOT_CANCEL_IN_PROGRESS`.

**BR-50 — Lý do hủy là bắt buộc**, tối thiểu 5 ký tự. Ghi vào `cancelReason`, kèm
`cancelledBy` (`ADMIN` / `DRIVER` / `SYSTEM`) và `cancelledAt`.

**BR-51 — Tài xế hủy thì chuyến được điều phối lại.** Đây là điểm khác biệt quan trọng
so với Admin hủy:

| Người hủy  | Kết quả                                                                                                                                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin**  | Chuyến → `CANCELLED` (kết thúc hẳn). Thông báo cho tài xế nếu đã được gán                                                                                                                                                   |
| **Tài xế** | Chuyến quay về `SEARCHING`, gỡ `driverId`/`vehicleId`/`acceptedAt`/`arrivedAt`, ghi nhận lượt hủy của tài xế, rồi **khởi động lại điều phối**. Tài xế vừa hủy bị loại khỏi vòng mới (BR-44 đã đảm bảo do đã có `RideOffer`) |

**BR-52 — Hủy chuyến không phát sinh giao dịch ví.** Không tính doanh thu, không thu phí
nền tảng, không ghi `WalletTransaction`. Ở phạm vi đồ án chưa áp dụng phí phạt hủy.

**BR-53 — Theo dõi tỷ lệ hủy.** Mỗi lần tài xế hủy, tăng `DriverProfile.cancelCount`.
Admin xem được chỉ số này trong danh sách tài xế để đánh giá chất lượng đối tác.

---

## 11. Ví và quyết toán tài chính

### 11.1. Nguyên tắc chung

**BR-54 — Mỗi tài khoản có đúng một ví.** Ràng buộc `UNIQUE(userId)` trên bảng `Wallet`.
Ví tài xế được tạo khi hồ sơ được duyệt (BR-19). Ví nền tảng gắn với tài khoản Admin gốc
và được tạo khi seed dữ liệu.

**BR-55 — Số dư ví được phép âm**, nhưng không âm quá `MAX_NEGATIVE_BALANCE`. Số dư âm
phản ánh khoản phí nền tảng mà tài xế đang nợ do đã trực tiếp thu tiền mặt từ khách.

**BR-56 — Không bao giờ ghi trực tiếp vào `Wallet.balance`.** Mọi thay đổi số dư đều phải
đi qua `WalletService.applyTransaction()`, hàm này luôn thực hiện đồng thời hai việc trong
một transaction: cập nhật số dư **và** chèn bản ghi `WalletTransaction`. Không có ngoại lệ.

**BR-57 — `balanceAfter` là ảnh chụp bắt buộc.** Mỗi `WalletTransaction` lưu số dư ví
**sau** khi giao dịch được áp dụng. Nhờ đó có thể đối soát: duyệt lịch sử theo thứ tự thời
gian, `balanceAfter` của giao dịch cuối cùng phải bằng `Wallet.balance` hiện tại. Đây là cơ
chế phát hiện sai lệch dữ liệu.

**BR-58 — Cập nhật số dư phải nguyên tử.** Dùng phép cộng dồn ngay trong câu `UPDATE`, không
đọc số dư ra bộ nhớ rồi tính:

```sql
UPDATE Wallet
SET    balance = balance + @amount,      -- @amount âm nếu là DEBIT
       updatedAt = SYSUTCDATETIME()
OUTPUT INSERTED.balance                  -- lấy balanceAfter ngay tại đây
WHERE  id = @walletId;
```

### 11.2. Loại giao dịch

| `type`              | `direction`      | Ý nghĩa                                                                                     |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `COMMISSION_FEE`    | `DEBIT`          | Trừ phí nền tảng khỏi ví tài xế                                                             |
| `COMMISSION_INCOME` | `CREDIT`         | Cộng phí vào ví nền tảng                                                                    |
| `RIDE_EARNING`      | `CREDIT`         | Cộng thu nhập chuyến (dùng khi thanh toán không dùng tiền mặt — dự phòng cho giai đoạn sau) |
| `TOPUP`             | `CREDIT`         | Tài xế nạp tiền, Admin duyệt                                                                |
| `WITHDRAW`          | `DEBIT`          | Tài xế rút tiền                                                                             |
| `ADJUSTMENT`        | `CREDIT`/`DEBIT` | Admin điều chỉnh thủ công, bắt buộc có mô tả                                                |

### 11.3. Công thức tính tiền

**BR-59:**

```
commissionRate = giá trị COMMISSION_RATE tại thời điểm hoàn thành chuyến

platformFee   = ROUND(finalFare * commissionRate, 0)
driverEarning = finalFare - platformFee
```

**Ví dụ:** `finalFare = 100.000đ`, `commissionRate = 0,10`

```
platformFee   = 100.000 x 0,10 = 10.000đ
driverEarning = 100.000 - 10.000 = 90.000đ
```

**BR-60 — Bắt buộc snapshot `commissionRate` vào bảng `Ride`.**
Ba cột `commissionRate`, `platformFee`, `driverEarning` được ghi vào `Ride` tại thời điểm
hoàn thành.

> **Vì sao không tính lại khi cần:** nếu nền tảng đổi phí từ 10% sang 15% vào tháng sau,
> mọi báo cáo doanh thu của các chuyến cũ sẽ bị tính sai nếu lấy tỷ lệ hiện hành. Snapshot
> tỷ lệ tại thời điểm giao dịch là nguyên tắc bắt buộc trong thiết kế cơ sở dữ liệu tài chính.

### 11.4. Luồng thanh toán tiền mặt

**BR-61 — Logic dòng tiền khi khách trả tiền mặt (`paymentMethod = 'CASH'`):**

Tài xế đã trực tiếp cầm toàn bộ `finalFare` từ tay khách. Nền tảng chưa nhận được đồng nào.
Do đó hệ thống **trừ** phần phí nền tảng khỏi ví tài xế:

```
Ví tài xế:    balance = balance - platformFee     (DEBIT, type = COMMISSION_FEE)
Ví nền tảng:  balance = balance + platformFee     (CREDIT, type = COMMISSION_INCOME)
```

Kết quả với chuyến 100.000đ: tài xế giữ 100.000đ tiền mặt, ví bị trừ 10.000đ → thu nhập
thực tế đúng bằng 90.000đ.

**BR-62 — Ghi sổ kép (double-entry).** Mỗi lần quyết toán sinh ra **hai** bản ghi
`WalletTransaction` đối ứng nhau. Tổng số dư toàn hệ thống luôn bằng 0 nếu không có nạp/rút.
Đây là cơ chế đối soát ở cấp hệ thống.

### 11.5. Transaction quyết toán khi hoàn thành chuyến

**BR-63 — Toàn bộ quy trình dưới đây nằm trong MỘT transaction duy nhất:**

```
BEGIN TRANSACTION

  (1) Chốt trạng thái chuyến — đồng thời là chốt chặn idempotent:
        UPDATE Ride
        SET status='COMPLETED', completedAt=SYSUTCDATETIME(),
            finalFare = ISNULL(finalFare, estimatedFare)
        WHERE id=@rideId AND status='IN_PROGRESS'

        NẾU @@ROWCOUNT = 0 -> ROLLBACK, trả 409
        (chuyến đã hoàn thành trước đó, hoặc đang ở trạng thái khác)

  (2) Đọc commissionRate hiện hành từ SystemConfig

  (3) Tính platformFee và driverEarning theo BR-59

  (4) Ghi snapshot vào Ride: commissionRate, platformFee, driverEarning

  (5) Ghi RideStatusHistory: IN_PROGRESS -> COMPLETED

  (6) NẾU paymentMethod = 'CASH' VÀ platformFee > 0:
        (6a) Trừ ví tài xế:
               UPDATE Wallet SET balance = balance - @platformFee
               OUTPUT INSERTED.balance WHERE id=@driverWalletId
             INSERT WalletTransaction(
               walletId=@driverWalletId, rideId=@rideId,
               type='COMMISSION_FEE', direction='DEBIT',
               amount=@platformFee, balanceAfter=@newBalance, ...)

        (6b) Cộng ví nền tảng:
               UPDATE Wallet SET balance = balance + @platformFee
               OUTPUT INSERTED.balance WHERE id=@platformWalletId
             INSERT WalletTransaction(
               walletId=@platformWalletId, rideId=@rideId,
               type='COMMISSION_INCOME', direction='CREDIT',
               amount=@platformFee, balanceAfter=@newBalance, ...)

COMMIT

-- Ngoài transaction (không được để việc gửi thông báo làm hỏng dữ liệu):
  Phát sự kiện Socket: wallet:updated, ride:status_changed
  Gửi thông báo đẩy cho tài xế
```

**BR-64 — Bảo đảm idempotent bằng hai lớp.**

| Lớp               | Cơ chế                                             | Vai trò                                                                                                       |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Lớp 1** — logic | `UPDATE ... WHERE status='IN_PROGRESS'` ở bước (1) | Chặn ngay từ đầu nếu chuyến đã hoàn thành                                                                     |
| **Lớp 2** — CSDL  | `UNIQUE(rideId, type)` trên `WalletTransaction`    | Lưới an toàn cuối cùng: dù logic có lỗ hổng, CSDL vẫn không cho ghi hai lần cùng loại phí cho cùng một chuyến |

> **Vì sao cần cả hai:** transaction và rollback chỉ bảo vệ khỏi việc ghi _dở dang_, hoàn
> toàn **không** bảo vệ khỏi việc client gọi API hai lần liên tiếp thành công. Nếu ứng dụng
> mất mạng ngay sau khi backend commit lần một rồi thử lại, nghiệp vụ sẽ chạy lần hai và trừ
> phí lần hai. BR-64 xử lý đúng tình huống này.

**BR-65 — Rollback khi có lỗi.** Bất kỳ lỗi nào trong transaction đều khiến toàn bộ bị hủy
bỏ: chuyến không chuyển sang `COMPLETED`, ví không bị trừ, không có bản ghi giao dịch nào.
Hệ thống không bao giờ rơi vào trạng thái nửa vời.

**BR-66 — Mức cô lập transaction.** Dùng `READ COMMITTED` (mặc định của SQL Server). Không
cần mức cao hơn vì các điều kiện tranh chấp đã được xử lý bằng `UPDATE` có điều kiện
(BR-33, BR-45, BR-58) thay vì bằng khóa tường minh.

### 11.6. Ngưỡng ví âm

**BR-67 — Hệ quả khi ví âm vượt ngưỡng `MAX_NEGATIVE_BALANCE`:**

1. Tài xế **không bật được** trạng thái ONLINE (BR-26 điều kiện 4).
2. Nếu đang online, tài xế bị **loại khỏi điều phối** (BR-40 điều kiện 7).
3. Nếu ngưỡng bị vượt ngay sau khi quyết toán chuyến, hệ thống tự động đặt `isOnline = 0`
   và gửi thông báo yêu cầu nạp tiền.
4. Chuyến đang dở dang **vẫn được hoàn tất bình thường** — không cắt ngang giữa chừng.

---

## 12. Nạp tiền vào ví

**BR-68 — Quy trình nạp tiền mô phỏng:**

```
Tài xế tạo yêu cầu nạp (số tiền + ảnh chụp biên lai chuyển khoản)
        -> TopUpRequest(status='PENDING')
                    |
        Admin xem và đối chiếu
                    |
    +---------------+---------------+
    |                               |
  Duyệt                          Từ chối (bắt buộc có lý do)
    |                               |
    v                               v
Transaction:                 TopUpRequest -> REJECTED
  - TopUpRequest -> APPROVED  + thông báo cho tài xế
  - Cộng ví tài xế
  - Ghi WalletTransaction(type='TOPUP', direction='CREDIT')
  - Phát wallet:updated
```

**BR-69 — Giới hạn số tiền nạp:** tối thiểu 20.000đ, tối đa 5.000.000đ mỗi lần.

**BR-70 — Mỗi tài xế chỉ có tối đa một yêu cầu `PENDING` tại một thời điểm.** Trả
`409 TOPUP_REQUEST_PENDING` nếu tạo yêu cầu thứ hai.

---

## 13. Thông báo

**BR-71 — Hai kênh bổ trợ cho nhau, không thay thế nhau:**

| Kênh                         | Dùng khi                         | Giới hạn                                         |
| ---------------------------- | -------------------------------- | ------------------------------------------------ |
| **Socket.IO**                | Ứng dụng đang mở và ở tiền cảnh  | Ngắt kết nối khi hệ điều hành thu hồi tiến trình |
| **Firebase Cloud Messaging** | Ứng dụng chạy nền hoặc đã bị tắt | Có độ trễ vài giây, không đảm bảo tuyệt đối      |

**BR-72 — Lời mời chuyến xe luôn gửi qua CẢ HAI kênh.**

> Đây là một lỗ hổng thiết kế thường gặp: nếu chỉ dùng Socket.IO, tài xế khóa màn hình điện
> thoại sẽ hoàn toàn không nhận được chuyến — hệ thống sẽ vô dụng trong thực tế.

**BR-73 — Chống trùng thông báo.** Bản tin FCM mang `rideId` và `offerId`. Nếu ứng dụng đã
hiển thị lời mời qua Socket, nó bỏ qua bản tin FCM cùng `offerId`.

**BR-74 — Danh sách thông báo cần gửi:**

| Sự kiện                               | Người nhận       | Kênh         |
| ------------------------------------- | ---------------- | ------------ |
| Hồ sơ được duyệt / từ chối            | Tài xế           | FCM + Socket |
| Có chuyến xe mới                      | Tài xế được chọn | FCM + Socket |
| Lời mời hết hạn / đã có người nhận    | Tài xế           | Socket       |
| Chuyến bị Admin hủy                   | Tài xế được gán  | FCM + Socket |
| Ví thay đổi số dư                     | Tài xế           | Socket       |
| Ví âm vượt ngưỡng                     | Tài xế           | FCM + Socket |
| Yêu cầu nạp tiền được duyệt / từ chối | Tài xế           | FCM + Socket |
| Chuyến mới được tạo / đổi trạng thái  | Admin            | Socket       |
| Không tìm được tài xế                 | Admin            | Socket       |

---

## 14. Bảng tổng hợp mã lỗi nghiệp vụ

| Mã lỗi                      | HTTP | Thông điệp hiển thị                    | Quy tắc liên quan |
| --------------------------- | ---- | -------------------------------------- | ----------------- |
| `INVALID_CREDENTIALS`       | 401  | Email hoặc mật khẩu không đúng         | BR-11             |
| `CURRENT_PASSWORD_INVALID`  | 401  | Mật khẩu hiện tại không đúng           | BR-06             |
| `ACCOUNT_LOCKED`            | 403  | Tài khoản đã bị khóa                   | BR-21             |
| `ACCOUNT_NOT_APPROVED`      | 403  | Hồ sơ của bạn đang chờ duyệt           | BR-07             |
| `EMAIL_ALREADY_EXISTS`      | 409  | Email đã được sử dụng                  | BR-04             |
| `PHONE_ALREADY_EXISTS`      | 409  | Số điện thoại đã được sử dụng          | BR-05             |
| `LICENSE_PLATE_EXISTS`      | 409  | Biển số xe đã tồn tại                  | BR-22             |
| `IDENTITY_INFORMATION_INCOMPLETE` | 400  | Vui lòng bổ sung thông tin định danh | BR-16             |
| `REJECT_REASON_REQUIRED`    | 400  | Vui lòng nhập lý do từ chối            | BR-18             |
| `NO_ACTIVE_VEHICLE`         | 400  | Bạn chưa có phương tiện được duyệt     | BR-26             |
| `LOCATION_REQUIRED`         | 400  | Vui lòng bật định vị để nhận chuyến    | BR-26             |
| `WALLET_BELOW_THRESHOLD`    | 403  | Ví của bạn đang âm vượt mức cho phép   | BR-67             |
| `ACTIVE_RIDE_EXISTS`        | 409  | Bạn đang có chuyến chưa hoàn thành     | BR-30             |
| `RIDE_ALREADY_TAKEN`        | 409  | Chuyến đã có tài xế khác nhận          | BR-45             |
| `INVALID_STATE_TRANSITION`  | 409  | Không thể chuyển sang trạng thái này   | BR-31             |
| `NOT_RIDE_OWNER`            | 403  | Bạn không phải tài xế của chuyến này   | BR-32             |
| `CANNOT_CANCEL_IN_PROGRESS` | 409  | Không thể hủy chuyến đang chở khách    | BR-49             |
| `CANCEL_REASON_REQUIRED`    | 400  | Vui lòng nhập lý do hủy chuyến         | BR-50             |
| `OFFER_EXPIRED`             | 409  | Lời mời đã hết hạn                     | BR-42             |
| `TOPUP_REQUEST_PENDING`     | 409  | Bạn đang có yêu cầu nạp tiền chờ duyệt | BR-70             |
| `TOPUP_AMOUNT_INVALID`      | 400  | Số tiền nạp không hợp lệ               | BR-69             |
| `FARE_OUT_OF_RANGE`         | 400  | Giá chuyến nằm ngoài khoảng cho phép   | BR-37             |
