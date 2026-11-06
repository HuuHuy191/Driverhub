# DriverHub — Ứng dụng dành cho tài xế công nghệ

Đồ án cơ sở CNTT. Hệ thống điều phối chuyến xe: **Admin (web)** tạo chuyến mô phỏng →
backend điều phối realtime → **Tài xế (mobile)** nhận, thực hiện, được quyết toán vào ví.

> **Trạng thái hiện tại và việc tiếp theo: đọc [`docs/PROJECT-STATUS.md`](docs/PROJECT-STATUS.md).**

---

## Cách làm việc với dự án này — đọc trước khi viết dòng code đầu tiên

Người dùng là **sinh viên năm 3, mới học lập trình có trợ lý AI**. Vai trò của bạn không chỉ
là viết code mà là **hướng dẫn họ hiểu code mình đang có**, vì họ phải bảo vệ đồ án trước hội đồng.

### 8 quy tắc bắt buộc

1. **Đọc tài liệu trước khi code.** Dự án có bộ tài liệu thiết kế đầy đủ trong `docs/`.
   Mọi quyết định nghiệp vụ đã được chốt ở đó. **Không tự bịa thiết kế mới.**
2. **Chỉ đọc đúng mục được chỉ định**, không đọc nguyên file. `BUSINESS-RULES.md` dài 796 dòng —
   đọc "mục 8" chứ đừng đọc cả file.
3. **Trích dẫn mã quy tắc trong comment code**, ví dụ `// BR-45`. Điều này giúp người dùng
   tra ngược được khi bảo vệ.
4. **Mỗi lần chỉ làm một việc nhỏ.** Không tạo 20 file một lượt. Người dùng phải đọc hiểu được
   từng bước.
5. **Trình bày kế hoạch trước khi làm việc lớn** (module mới, đổi schema, logic tài chính).
   Chờ duyệt rồi mới code.
6. **Không tự thêm tính năng ngoài phạm vi.** Xem mục "Ngoài phạm vi" ở cuối file.
7. **Báo cáo ngắn gọn:** mỗi file đã sửa một dòng. Không in lại nội dung file ra chat.
   Không giải thích dài nếu không được hỏi.
8. **Không chạy test / lint / build giữa chừng.** Chỉ chạy một lần khi xong việc, hoặc để
   người dùng tự chạy.

### Khi phát hiện mâu thuẫn giữa tài liệu và thực tế

**Dừng lại và hỏi.** Không tự ý đi lệch tài liệu. Nếu thống nhất đổi, phải cập nhật tài liệu
trong cùng lần thay đổi — không để code và tài liệu lệch nhau.

---

## Kho mã

| Thư mục          | Công nghệ                                                 | Cổng |
| ---------------- | --------------------------------------------------------- | ---- |
| `backend/`       | NestJS 10 + TypeScript + TypeORM + SQL Server + Socket.IO | 3000 |
| `admin-web/`     | React 18 + Vite + Ant Design + TanStack Query             | 5173 |
| `driver-mobile/` | Flutter 3 + Riverpod + Dio + flutter_map                  | —    |
| `docs/`          | Tài liệu thiết kế                                         | —    |

## Lệnh thường dùng

```bash
# Backend
cd backend && npm run start:dev
npm run migration:run
npm run migration:generate -- src/database/migrations/TenMigration
npm run test          # unit
npm run test:e2e      # integration (chạy vào DriverHub_Test)
npm run lint

# Admin web
cd admin-web && npm run dev

# Mobile
cd driver-mobile && flutter run
flutter analyze
```

Swagger: `http://localhost:3000/api/docs`

## Tài liệu

| File                     | Nội dung                                                       |
| ------------------------ | -------------------------------------------------------------- |
| `docs/PROJECT-STATUS.md` | **Trạng thái hiện tại, việc đã xong, việc tiếp theo**          |
| `docs/BUSINESS-RULES.md` | **Quan trọng nhất.** 70 quy tắc `BR-xx` + bảng mã lỗi (mục 14) |
| `docs/DATABASE.md`       | 14 bảng, DDL, ràng buộc, chỉ mục, truy vấn đối soát (mục 8.4)  |
| `docs/API.md`            | 61 endpoint + 16 sự kiện Socket                                |
| `docs/ARCHITECTURE.md`   | Phân tầng, luồng dữ liệu, quy ước đặt tên                      |
| `docs/FEATURES.md`       | Danh sách chức năng + 23 ca kiểm thử (mục 15)                  |
| `docs/SETUP.md`          | Cài đặt môi trường, xử lý sự cố                                |

---

## 5 quy tắc kỹ thuật không được vi phạm

### 1. Chuyển trạng thái luôn dùng `UPDATE ... WHERE` có điều kiện (BR-33, BR-45)

Không bao giờ đọc trạng thái ra rồi mới ghi đè — đó là lỗ hổng race condition.

```sql
UPDATE Ride SET driverId=@d, status='ACCEPTED', acceptedAt=SYSUTCDATETIME()
WHERE id=@id AND status='SEARCHING' AND driverId IS NULL;
-- rowsAffected = 0  =>  ném 409, KHÔNG thử lại
```

### 2. Mọi thao tác tiền nằm trong transaction và phải idempotent (BR-63, BR-64)

- Bước đầu tiên luôn là `UPDATE Ride ... WHERE status='IN_PROGRESS'`; `rowsAffected = 0` → `409`.
- **Không bao giờ** ghi trực tiếp `Wallet.balance` — luôn qua `WalletService.applyTransaction()`,
  hàm này cập nhật số dư **và** ghi `WalletTransaction` trong cùng transaction.
- Cập nhật số dư bằng `balance = balance + @amount`, không đọc ra rồi tính.
- Filtered index `UX_WT_Ride_Type` ở CSDL là lưới an toàn cuối — không được xóa.

### 3. Snapshot `commissionRate` vào bảng `Ride` (BR-60)

Khi hoàn thành chuyến, ghi `commissionRate`, `platformFee`, `driverEarning` vào `Ride`.
Báo cáo doanh thu đọc từ các cột này, **không** đọc lại `SystemConfig`.

### 4. Không hardcode tham số nghiệp vụ (BR-01)

Phí 10%, timeout 20 giây, ngưỡng ví âm… đọc từ `SettingsService` (cache `SystemConfig`).

### 5. Không gọi dịch vụ ngoài bên trong transaction

Gửi FCM, email, phát sự kiện Socket, upload Cloudinary — tất cả nằm **sau** `commit`.
Luôn có `finally { await queryRunner.release(); }`.

---

## Quy ước

| Đối tượng      | Quy ước                                    | Ví dụ                                         |
| -------------- | ------------------------------------------ | --------------------------------------------- |
| Bảng CSDL      | PascalCase, số ít                          | `DriverProfile`                               |
| Cột CSDL       | camelCase                                  | `approvalStatus`                              |
| Khóa ngoại     | `<tênBảng>Id`                              | `driverId`                                    |
| Enum           | UPPER_SNAKE_CASE                           | `IN_PROGRESS`                                 |
| Endpoint       | kebab-case, số nhiều                       | `/api/v1/ride-offers`                         |
| Sự kiện Socket | `nhóm:hànhĐộng`                            | `ride:offer`                                  |
| File TS / Dart | kebab-case / snake_case                    | `wallet.service.ts` / `ride_detail_page.dart` |
| Tiền           | `decimal(18,0)` VNĐ nguyên                 | không dùng `float`                            |
| Thời gian      | `datetime2(3)` **UTC**, `SYSUTCDATETIME()` | không dùng `GETDATE()`                        |

**`User` là từ khóa SQL Server** — luôn viết `[User]` trong T-SQL.

### Phân tầng backend

```
Controller  -> nhận request, validate DTO, gọi Service. KHÔNG chứa logic nghiệp vụ.
Guard       -> JwtAuthGuard, RolesGuard, ApprovedDriverGuard, WsJwtGuard
Service     -> toàn bộ quy tắc nghiệp vụ + quản lý transaction. KHÔNG biết về HTTP.
Repository  -> truy vấn CSDL. KHÔNG ra quyết định nghiệp vụ.
Gateway     -> chỉ phát/nhận sự kiện Socket, ủy thác logic cho Service.
```

Client (Flutter/React) chỉ chặn sớm cho thân thiện — **không bao giờ** là lớp bảo vệ.

### Lỗi trả về

Ném `BusinessException(errorCode, httpStatus)`. `AllExceptionsFilter` chuẩn hóa thành:

```json
{
  "statusCode": 409,
  "errorCode": "RIDE_ALREADY_TAKEN",
  "message": "...",
  "timestamp": "...",
  "path": "..."
}
```

Client xử lý theo `errorCode`, không phân tích `message`.
Thêm mã lỗi mới → cập nhật `docs/BUSINESS-RULES.md` mục 14.

---

## Máy trạng thái chuyến xe (BR-31)

```
SEARCHING ──► ACCEPTED ──► ARRIVED ──► IN_PROGRESS ──► COMPLETED
    │             │            │
    │             └────────────┴──► CANCELLED  (Admin hoặc tài xế)
    │                               ACCEPTED/ARRIVED + tài xế hủy => quay về SEARCHING
    ├──► CANCELLED          (Admin hủy)
    └──► NO_DRIVER_FOUND    (hết 3 vòng điều phối)
```

`IN_PROGRESS` **không hủy được** — lối ra duy nhất là `COMPLETED`.
Chuyển trạng thái ngoài sơ đồ → `409 INVALID_STATE_TRANSITION`.
Mỗi lần chuyển thành công phải ghi `RideStatusHistory` trong cùng transaction.

---

## Bảo mật

- Mật khẩu: `bcrypt` cost 10. Refresh token: băm trước khi lưu.
- Socket xác thực JWT trong `handshake.auth`; mỗi tài xế join room `driver:{id}`.
  Lời mời chuyến **không bao giờ** broadcast toàn hệ thống.
- `ValidationPipe`: `whitelist: true, forbidNonWhitelisted: true`.
- Raw query phải tham số hóa — **không nối chuỗi SQL**.
- Bí mật trong `.env` / `.env.test` (đã `.gitignore`). Không commit
  `google-services.json`, `firebase-adminsdk-*.json`.

---

## Khi thêm chức năng mới

1. Đọc quy tắc liên quan trong `docs/BUSINESS-RULES.md`.
2. Đổi schema: sửa entity → `migration:generate` → **đọc kỹ file migration sinh ra**
   (TypeORM không tự sinh filtered index, phải thêm tay) → cập nhật `docs/DATABASE.md`.
3. Viết Service trước, Controller sau.
4. Thêm endpoint → cập nhật `docs/API.md` và decorator Swagger.
5. Chức năng động tới tiền hoặc trạng thái → **bắt buộc** viết integration test.
6. Đánh dấu `[x]` mục tương ứng trong `docs/FEATURES.md` và cập nhật `docs/PROJECT-STATUS.md`.

## Ngoài phạm vi — đừng tự thêm

Ứng dụng khách hàng · cổng thanh toán thật · dẫn đường turn-by-turn · chat · ghép chuyến ·
giá động theo giờ cao điểm · Redis adapter (hệ thống chạy một tiến trình).
