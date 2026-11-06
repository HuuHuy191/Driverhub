# PROJECT STATUS — Trạng thái dự án

> **File này là điểm khởi đầu cho mọi phiên làm việc mới.**
> Cập nhật sau mỗi chặng hoàn thành.

**Cập nhật lần cuối:** 05/11/2026
**Giai đoạn hiện tại:** Đăng ký tài xế không ảnh đã triển khai; E2E cần cấu hình database test

---

## 1. Tóm tắt một dòng

Backend NestJS và các luồng Flutter tài xế D01–D20 đã hoàn thiện; trang quản trị React
A01–A12 đã triển khai. Đăng ký tài xế dùng thông tin CCCD/GPLX thay cho ảnh; migration đã
chạy trên `DriverHub`. Unit test/build/analyzer đạt; E2E chờ cấu hình `backend/.env.test`.
FCM tiếp tục hoãn.

---

## 2. Đã hoàn thành

### Backend (`backend/`) — ✅ XONG

| Hạng mục          | Nội dung                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Hạ tầng           | NestJS 10 + TypeScript + CommonJS, TypeORM, SQL Server 2022, Joi kiểm tra biến môi trường                                               |
| Cơ sở dữ liệu     | 14 bảng, 9 ràng buộc UNIQUE (có 3 filtered unique index), 11 index, 20+ CHECK constraint                                                |
| Seed              | `seed-config` (12 tham số), `seed-admin` (Admin + ví nền tảng), `seed-demo`                                                             |
| Tầng chắn         | `BusinessException`, `AllExceptionsFilter`, `TransformInterceptor`, decorator `@Public/@Roles/@CurrentUser`, `SettingsService` có cache |
| Xác thực          | Đăng ký tài xế trực tiếp không OTP, đăng nhập, refresh token có xoay vòng, đổi mật khẩu khi đã đăng nhập                                |
| Guard             | `JwtAuthGuard` (toàn cục), `RolesGuard`, `ApprovedDriverGuard`, `WsJwtGuard`                                                            |
| Hồ sơ tài xế      | Nộp thông tin CCCD/GPLX để Admin duyệt thủ công; từ chối kèm lý do, khóa tài khoản                                                        |
| Phương tiện       | CRUD, đổi xe hoạt động (BR-23), Admin duyệt xe                                                                                          |
| Trạng thái tài xế | Bật/tắt ONLINE với 5 điều kiện kiểm tra (BR-26), cập nhật vị trí                                                                        |
| Chuyến xe         | Máy trạng thái 7 trạng thái, công thức tính giá, tạo chuyến, `rideCode`, Admin list/detail                                              |
| **Nhận chuyến**   | Optimistic concurrency bằng `UPDATE ... WHERE` (BR-45) — **đã kiểm chứng bằng test đồng thời**                                          |
| **Quyết toán**    | Transaction 6 bước, idempotent 2 lớp (BR-64), snapshot `commissionRate` (BR-60), ghi sổ kép (BR-62)                                     |
| Ví                | Xem số dư, lịch sử giao dịch, nạp tiền có Admin duyệt, ngưỡng ví âm                                                                     |
| Realtime          | Socket.IO Gateway xác thực JWT trong handshake, room `driver:{id}` và `admin`, 16 sự kiện                                               |
| **Điều phối**     | Lọc 9 điều kiện + bounding box + `STDistance`, điều phối 3 vòng có timeout, job quét offer hết hạn mỗi 5 giây                           |
| Hủy chuyến        | Admin hủy (kết thúc hẳn) / Tài xế hủy (quay về `SEARCHING` + điều phối lại)                                                             |
| Cấu hình          | Admin xem/sửa `SystemConfig`, cache tự làm mới                                                                                          |
| Dashboard         | Số liệu tổng quan, thống kê hiệu quả điều phối                                                                                          |
| Thông báo         | Ghi bảng `Notification` + phát Socket                                                                                                   |
| Tài liệu API      | Swagger đầy đủ tại `/api/docs`                                                                                                          |

### Kiểm thử — ⚠️ E2E CHƯA ĐỦ

```
Backend:    npm run build đạt; unit test — 3 suite / 24 test đạt
Admin web:  npm run build đạt
Flutter:    flutter analyze sạch; flutter test — 1 test đạt; release APK build đạt
Migration:  AddDriverIdentityDetails1793878599000 đã chạy trên DriverHub
E2E:        chưa chạy vì môi trường hiện tại chưa có backend/.env.test
```

E2E phải dùng database riêng **`DriverHub_Test`** qua `backend/.env.test`.
`globalSetup` dừng trước khi truy cập CSDL nếu `DB_DATABASE` không kết thúc bằng `_Test`.
Các E2E đăng ký/resubmit mới và kiểm thử Admin list/detail chưa được xác minh; cần cấu hình
file này trỏ tới database test trước khi chạy lại. Không dùng database phát triển.

### 3 truy vấn đối soát sổ cái (`DATABASE.md` mục 8.4) — ✅ SẠCH

- Số dư ví khớp `balanceAfter` của bút toán cuối
- Ghi sổ kép cân bằng (tổng bằng 0)
- Không chuyến nào bị thu phí hai lần

### Ứng dụng tài xế Flutter — D01–D20 ✅ HOÀN THÀNH

Đã có trang chính và ONLINE/GPS, lời mời realtime, luồng chuyến, lịch sử/chi tiết,
ví/giao dịch/nạp tiền, thống kê, hồ sơ và cài đặt/đăng xuất. Đăng ký dùng 3 bước,
nhập số/ngày cấp CCCD và GPLX; không tải ảnh giấy tờ.
D21 có danh sách thông báo, đánh dấu đã đọc và cập nhật qua Socket.IO; D22 có đổi mật khẩu,
đăng xuất và thông tin ứng dụng. Widget test đạt; FCM tiếp tục hoãn.
Backend bổ sung API tài xế xem chuyến của mình và gửi lại hồ sơ bị từ chối.
Admin web A01–A12 đã triển khai.

---

## 3. Đang hoãn có chủ ý

| Hạng mục                     | Lý do                                                                                               | Làm ở     |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | --------- |
| **Firebase Cloud Messaging** | Cần app Flutter thật để kiểm thử thông báo đẩy. Đã có sẵn interface `FcmService` rỗng với `// TODO` | Chặng 21  |
| Redis adapter cho Socket.IO  | Hệ thống chạy một tiến trình, nằm ngoài phạm vi đồ án. Ghi nhận là giới hạn đã biết                 | Không làm |

---

## 4. Việc tiếp theo

### Chặng 18 — Khởi tạo Flutter ✅ XONG

Dựng nền tảng ứng dụng tài xế: cấu trúc thư mục, `ApiClient` (Dio) có tự refresh token và
chống làm mới song song, `SecureStorageService`, các model dữ liệu, theme, router.
Access token chỉ lưu trong bộ nhớ ứng dụng; refresh token lưu bằng `flutter_secure_storage`.

### Lộ trình còn lại

| Chặng | Nội dung                                                    | Màn hình liên quan (`FEATURES.md` mục 14.1) |
| ----- | ----------------------------------------------------------- | ------------------------------------------- |
| 18    | Flutter: nền tảng, tầng mạng, model — ✅                    | —                                           |
| 19    | Flutter: đăng nhập, đăng ký 3 bước, chờ duyệt — ✅          | D01–D08                                     |
| 20    | Flutter: trang chính, ONLINE, bản đồ, vị trí, hồ sơ — ✅    | D10, D20                                    |
| 21    | Flutter: lời mời và luồng chuyến — ✅; FCM còn hoãn         | D11–D15                                     |
| 22    | Flutter: ví/thống kê — ✅; D21/D22 đã triển khai, chưa kiểm thử | D16–D22                                  |
| 23    | Admin web: khởi tạo, API, đăng nhập, layout — ✅            | A01                                         |
| 24    | Admin web: quản lý tài xế, khách hàng, tạo chuyến — ✅       | A03–A06                                     |
| 25    | Admin web: chuyến realtime, dashboard, ví, cấu hình — ✅    | A02, A07–A12                                |

Backend/Admin đã cập nhật và health check đạt; migration chạy thành công. Kiểm thử E2E
cần chờ `.env.test` trỏ tới `DriverHub_Test`; không dùng database phát triển.
FCM vẫn hoãn; D21/D22 đã triển khai.

---

## 5. Môi trường phát triển

| Thành phần                  | Giá trị                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| Node.js                     | 20 LTS (qua nvm-windows)                                            |
| SQL Server                  | 2022, instance mặc định `localhost:1433`, TCP/IP đã bật, Mixed Mode |
| Database chính              | `DriverHub`                                                         |
| Database test               | `DriverHub_Test`                                                    |
| Tài khoản CSDL              | `sa`                                                                |
| Backend                     | `http://localhost:3000`, Swagger tại `/api/docs`                    |
| Dịch vụ ngoài đã cấu hình   | Cloudinary (ảnh)                                                     |
| Dịch vụ ngoài chưa cấu hình | Firebase (FCM)                                                      |

**Thiết bị chạy Flutter:** ưu tiên điện thoại Android thật qua USB debugging — nhẹ máy hơn
máy ảo và là cách duy nhất kiểm thử được FCM.
Khi dùng máy thật, `BASE_URL` phải là IP nội bộ của máy tính (ví dụ `http://192.168.1.15:3000`),
không dùng `localhost`. Với máy ảo Android thì dùng `http://10.0.2.2:3000`.

---

## 6. Quyết định kỹ thuật đã chốt (đừng đặt lại vấn đề)

| Quyết định                                                              | Lý do                                                                                    |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| NestJS **10** + CommonJS + Jest, không dùng bản mới nhất (ESM + vitest) | TypeORM CLI (`migration:generate`) chạy ổn định với CommonJS; ESM gây nhiều lỗi khó tra  |
| Optimistic concurrency thay vì khóa bi quan                             | Không giữ khóa lâu, không deadlock, diễn đạt ý định ngay trong câu lệnh                  |
| Snapshot `commissionRate` vào `Ride`                                    | Báo cáo doanh thu lịch sử vẫn đúng sau khi đổi chính sách phí                            |
| Ghi sổ kép cho phí nền tảng                                             | Cho phép đối soát ở cấp hệ thống                                                         |
| OpenStreetMap (`flutter_map`) thay Google Maps                          | Miễn phí, không cần khai báo thẻ tín dụng                                                |
| Ant Design cho Admin web                                                | Không tự dựng giao diện, dồn thời gian cho backend và mobile                             |
| `isOnline` không tự tắt khi mất Socket                                  | Mạng di động chập chờn là bình thường; lọc bằng `lastLocationUpdatedAt` thay thế (BR-28) |
| Không dùng Redis                                                        | Một tiến trình duy nhất, ngoài phạm vi                                                   |

---

## 7. Những chỗ đã từng mắc lỗi — tránh lặp lại

| Lỗi                                                                             | Cách phòng                                                                   |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Fixture trong e2e test thiếu cột `NOT NULL` (`createdBy`)                       | Dùng helper tạo fixture chung ở `test/helpers/fixtures.ts`                   |
| `cleanupFixture` truy cập `fixture` khi nó `undefined`, che mất lỗi thật        | Mọi hàm dọn dẹp bắt đầu bằng `if (!fixture) return;` và bọc try/catch        |
| `globalSetup` chạy lệnh con TypeORM có thể nạp `.env`                             | Truyền cấu hình `.env.test` cho tiến trình con và chặn DB không có hậu tố `_Test` |
| Database test thiếu Admin + ví nền tảng → test quyết toán fail                  | `globalSetup` seed đủ cấu hình **và** Admin/ví nền tảng                      |
| Tiến trình nền `startDispatch()` chạy sau khi app đóng → `Connection is closed` | Kiểm tra `dataSource.isInitialized` trước mỗi truy vấn nền                   |
| `SettingsService` có `setInterval` làm Jest không thoát                         | `OnModuleDestroy` + `clearInterval` + `.unref()`                             |
| Quên bọc `[User]` trong T-SQL                                                   | `User` là từ khóa SQL Server                                                 |
