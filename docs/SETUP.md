# SETUP — Hướng dẫn cài đặt và chạy dự án

---

## 1. Yêu cầu môi trường

| Phần mềm                                                   | Phiên bản      | Ghi chú                                                    |
| ---------------------------------------------------------- | -------------- | ---------------------------------------------------------- |
| Node.js                                                    | 20 LTS         | `node -v` để kiểm tra                                      |
| npm                                                        | 10+            | Đi kèm Node.js                                             |
| SQL Server                                                 | 2019 hoặc 2022 | Bản Developer hoặc Express đều được (miễn phí)             |
| SQL Server Management Studio (SSMS) hoặc Azure Data Studio | mới nhất       | Công cụ xem và truy vấn CSDL                               |
| Flutter SDK                                                | 3.19+          | `flutter doctor` phải không còn lỗi đỏ                     |
| Android Studio                                             | mới nhất       | Cần cho Android SDK và trình giả lập                       |
| Git                                                        | 2.40+          |                                                            |
| Docker Desktop                                             | mới nhất       | **Tùy chọn** — chỉ khi muốn chạy SQL Server bằng container |

### Tài khoản dịch vụ ngoài (đều có gói miễn phí)

| Dịch vụ            | Dùng để                         | Đăng ký tại                       |
| ------------------ | ------------------------------- | --------------------------------- |
| Cloudinary         | Lưu ảnh giấy tờ và ảnh đại diện | cloudinary.com                    |
| Firebase           | Thông báo đẩy FCM               | console.firebase.google.com       |

---

## 2. Chạy toàn bộ dịch vụ bằng Docker

Docker Compose khởi động SQL Server, backend và Admin web. Flutter vẫn chạy trên
emulator/điện thoại và kết nối tới backend qua cổng máy chủ. Cần bật Docker Desktop ở chế độ
Linux containers trước khi chạy.

### 2.1. Tạo cấu hình môi trường

Trong PowerShell tại thư mục gốc dự án:

```powershell
Copy-Item backend\.env.example backend\.env
```

Mở `backend\.env`, điền các giá trị bắt buộc như `DB_PASSWORD`, hai JWT secret (mỗi secret
ít nhất 32 ký tự) và `SEED_ADMIN_PASSWORD`. Dùng mật khẩu SQL Server đủ
mạnh cho SQL Server local. Không commit file này.

Tạo thêm file `.env` ở thư mục gốc chỉ chứa mật khẩu riêng cho SQL Server trong Docker:

```dotenv
DOCKER_DB_PASSWORD=YourStrongDockerPassword123!
```

Đổi giá trị ví dụ thành mật khẩu riêng dài ít nhất 8 ký tự, có ít nhất 3 trong 4 nhóm:
chữ hoa, chữ thường, chữ số và ký tự đặc biệt. File `.env` gốc đã được Git bỏ qua.
`backend\.env` và `.env` gốc là hai cấu hình riêng: Compose dùng mật khẩu Docker cho
database trong container, không làm thay đổi mật khẩu SQL Server local.

### 2.2. Khởi động

```powershell
docker compose up --build -d
```

Sau khi sửa mã nguồn backend hoặc admin-web, chạy lại lệnh có `--build` ở trên.
`docker compose up -d` chỉ khởi động image hiện có, không đưa mã nguồn mới vào image.

Compose tự tạo database `DriverHub` với collation `Vietnamese_CI_AS`, chạy migration,
nạp cấu hình nghiệp vụ khi database mới được tạo, rồi tạo Admin nếu chưa có.
Các địa chỉ sau khi khởi động:

| Dịch vụ       | Địa chỉ                                  |
| ------------- | ---------------------------------------- |
| Admin web     | `http://localhost:8080`                  |
| Backend API   | `http://localhost:3000/api/v1/health`    |
| Swagger       | `http://localhost:3000/api/docs`         |
| SQL Server    | `localhost:14330` (dùng SSMS nếu cần)    |

SQL Server dùng volume Docker riêng. Dừng các dịch vụ nhưng giữ dữ liệu:

```powershell
docker compose down
```

Không thêm `-v` nếu muốn giữ database.

### 2.3. Kết nối Flutter tới backend trong Docker

- Điện thoại thật qua USB: bật USB debugging, chạy `adb reverse tcp:3000 tcp:3000`,
  rồi build/cài APK với `--dart-define=BASE_URL=http://127.0.0.1:3000`.
  Cấu hình Android cho phép HTTP tới `127.0.0.1`. Giữ dây USB khi sử dụng;
  nếu rút/cắm lại dây, chạy lại lệnh `adb reverse`.

- Android emulator: cấu hình mặc định `http://10.0.2.2:3000` đã trỏ tới máy chủ.
- Điện thoại thật: dùng IP LAN của máy tính, ví dụ:

```powershell
flutter run --dart-define=BASE_URL=http://192.168.1.15:3000
```

Khi kết nối qua Wi-Fi, thay địa chỉ ví dụ bằng IP LAN thực tế của máy chạy Docker.
Không dùng `localhost` trên điện thoại khi kết nối qua Wi-Fi.

---

## 3. Cài đặt Backend

```bash
cd backend
npm install
```

### 3.1. Tạo file `.env`

```powershell
Copy-Item .env.example .env
```

Nếu chạy toàn bộ bằng Docker theo mục 2 thì bỏ qua lệnh này nếu `backend\.env` đã được tạo.

Nội dung `.env`:

```bash
# ── Ứng dụng ────────────────────────────────────────────
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# ── Cơ sở dữ liệu ───────────────────────────────────────
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=DriverHub@2026
DB_DATABASE=DriverHub
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true

# ── JWT ─────────────────────────────────────────────────
JWT_ACCESS_SECRET=doi_thanh_chuoi_ngau_nhien_it_nhat_32_ky_tu
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_SECRET=mot_chuoi_ngau_nhien_KHAC_it_nhat_32_ky_tu
JWT_REFRESH_EXPIRES=30d

# ── Cloudinary ──────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=ten_cloud_cua_ban
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# ── Firebase (thông báo đẩy) ────────────────────────────
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ── CORS ────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:5173

# ── Tài khoản Admin khởi tạo ────────────────────────────
SEED_ADMIN_EMAIL=admin@driverhub.local
SEED_ADMIN_PASSWORD=Admin@123456
```

> ⚠️ **`.env` phải nằm trong `.gitignore`.** Không bao giờ commit file này lên Git.
> Chỉ commit `.env.example` với các giá trị để trống.

### 3.2. Sinh chuỗi bí mật cho JWT

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Chạy hai lần, lấy hai giá trị khác nhau cho `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET`.

### 3.3. Chạy migration và seed dữ liệu

```bash
npm run migration:run      # tạo toàn bộ 14 bảng, ràng buộc và chỉ mục
npm run seed:config        # nạp 12 tham số vào SystemConfig
npm run seed:admin         # tạo tài khoản Admin và ví nền tảng
npm run seed:demo          # (tùy chọn) dữ liệu mô phỏng để kiểm thử
```

### 3.4. Khởi động Backend

```bash
npm run start:dev
```

Kiểm tra:

| Địa chỉ                               | Nội dung             |
| ------------------------------------- | -------------------- |
| `http://localhost:3000/api/v1/health` | `{ "status": "ok" }` |
| `http://localhost:3000/api/docs`      | Giao diện Swagger    |

---

## 4. Cài đặt trang quản trị

```bash
cd admin-web
npm install
cp .env.example .env
```

`.env`:

```bash
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

```bash
npm run dev
```

Mở `http://localhost:5173` và đăng nhập bằng `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

---

## 5. Cài đặt ứng dụng tài xế

```bash
cd driver-mobile
flutter pub get
```

### 5.1. Cấu hình địa chỉ máy chủ

Tạo `lib/core/config/app_config.dart`:

```dart
class AppConfig {
  // Trình giả lập Android: 10.0.2.2 trỏ tới localhost của máy tính
  // Máy thật: dùng địa chỉ IP nội bộ, ví dụ http://192.168.1.15:3000
  static const String baseUrl = String.fromEnvironment(
    'BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static String get apiUrl    => '$baseUrl/api/v1';
  static String get socketUrl => baseUrl;
}
```

> **Lỗi rất phổ biến:** dùng `localhost` trong ứng dụng Android. Trong trình giả lập,
> `localhost` trỏ về chính máy ảo, không phải máy tính. Phải dùng `10.0.2.2`.
> Với máy thật, lấy IP bằng `ipconfig` (Windows) và đảm bảo điện thoại cùng mạng Wi-Fi.

### 5.2. Cho phép HTTP khi phát triển

Android 9 trở lên chặn HTTP không mã hóa. Tạo
`android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">192.168.1.15</domain>
    </domain-config>
</network-security-config>
```

Khai báo trong `android/app/src/main/AndroidManifest.xml`:

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ... >
```

### 5.3. Khai báo quyền

Trong `AndroidManifest.xml`, đặt **trước** thẻ `<application>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.CALL_PHONE" />
```

### 5.4. Cấu hình Firebase

```bash
dart pub global activate flutterfire_cli
flutterfire configure --project=<firebase-project-id>
```

Lệnh này tự sinh `lib/firebase_options.dart` và đặt `android/app/google-services.json`.

### 5.5. Chạy ứng dụng

```bash
flutter devices                    # xem danh sách thiết bị
flutter run                        # chạy trên thiết bị mặc định
flutter run --dart-define=BASE_URL=http://192.168.1.15:3000   # chỉ định máy chủ
```

---

## 6. Bảng lệnh thường dùng

### Backend

| Lệnh                                                                 | Tác dụng                          |
| -------------------------------------------------------------------- | --------------------------------- |
| `npm run start:dev`                                                  | Chạy với chế độ tự khởi động lại  |
| `npm run build`                                                      | Biên dịch sang thư mục `dist/`    |
| `npm run start:prod`                                                 | Chạy bản đã biên dịch             |
| `npm run lint`                                                       | Kiểm tra và sửa lỗi ESLint        |
| `npm run format`                                                     | Định dạng mã bằng Prettier        |
| `npm run test`                                                       | Chạy unit test                    |
| `npm run test:e2e`                                                   | Chạy integration test             |
| `npm run test:cov`                                                   | Chạy test kèm báo cáo độ bao phủ  |
| `npm run migration:generate -- src/database/migrations/TenMigration` | Sinh migration từ thay đổi entity |
| `npm run migration:run`                                              | Áp dụng migration                 |
| `npm run migration:revert`                                           | Hoàn tác migration gần nhất       |
| `npm run seed:config`                                                | Nạp `SystemConfig`                |
| `npm run seed:admin`                                                 | Tạo Admin và ví nền tảng          |
| `npm run seed:demo`                                                  | Tạo dữ liệu mô phỏng              |

### Trang quản trị

| Lệnh              | Tác dụng                |
| ----------------- | ----------------------- |
| `npm run dev`     | Chạy máy chủ phát triển |
| `npm run build`   | Build ra `dist/`        |
| `npm run preview` | Xem thử bản build       |
| `npm run lint`    | Kiểm tra ESLint         |

### Ứng dụng tài xế

| Lệnh                          | Tác dụng                      |
| ----------------------------- | ----------------------------- |
| `flutter pub get`             | Cài thư viện                  |
| `flutter run`                 | Chạy ứng dụng                 |
| `flutter analyze`             | Kiểm tra mã tĩnh              |
| `flutter test`                | Chạy test                     |
| `flutter build apk --release` | Đóng gói APK                  |
| `flutter clean`               | Xóa bộ nhớ đệm khi gặp lỗi lạ |

---

## 7. Thứ tự khởi động khi làm việc hằng ngày

```
1. Khởi động SQL Server        (dịch vụ Windows, hoặc: Docker Compose theo mục 2)
2. cd backend    && npm run start:dev      -> cổng 3000
3. cd admin-web  && npm run dev            -> cổng 5173
4. cd driver-mobile && flutter run         -> trình giả lập / máy thật
```

---

## 8. Kịch bản kiểm tra nhanh sau khi cài xong

Chạy lần lượt để xác nhận toàn hệ thống hoạt động:

```
 1. Mở Swagger, gọi POST /auth/login với tài khoản Admin        -> nhận token
 2. Mở trang Admin, đăng nhập                                    -> vào Dashboard
 3. Mở ứng dụng Flutter, nhập email và hoàn tất 3 bước đăng ký   -> nhập CCCD/GPLX
 4. Gửi hồ sơ đăng ký                                             -> màn hình "Chờ duyệt"
 5. Trên trang Admin, duyệt hồ sơ                                -> Flutter chuyển màn hình ngay (Socket)
 6. Trên Flutter, bật ONLINE                                     -> Admin thấy tài xế online
 7. Trên trang Admin, tạo một chuyến xe                          -> điện thoại rung, hiện lời mời
 8. Trên Flutter, bấm Nhận chuyến                                -> Admin thấy trạng thái đổi ngay
 9. Cập nhật ARRIVED -> IN_PROGRESS -> COMPLETED                 -> hiện màn hình quyết toán
10. Mở màn hình Ví                                               -> số dư âm đúng bằng 10% giá chuyến
11. Chạy 3 truy vấn đối soát ở DATABASE.md mục 8.4               -> cả ba đều rỗng / bằng 0
```

Hoàn thành đủ 11 bước nghĩa là toàn bộ luồng cốt lõi đã chạy đúng.

---

## 9. Xử lý sự cố thường gặp

### Backend

| Triệu chứng                              | Nguyên nhân                                        | Cách khắc phục                                                                                                       |
| ---------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Failed to connect to localhost:1433`    | Chưa bật TCP/IP                                    | SQL Server Configuration Manager → bật TCP/IP → khởi động lại dịch vụ                                                |
| `Login failed for user 'sa'`             | Chưa bật Mixed Mode hoặc tài khoản `sa` bị vô hiệu | SSMS → chuột phải server → Properties → Security → chọn _SQL Server and Windows Authentication mode_ → khởi động lại |
| `self signed certificate`                | Thiếu cấu hình TLS                                 | Đặt `DB_TRUST_SERVER_CERT=true` trong `.env`                                                                         |
| Tiếng Việt hiển thị thành `?????`        | Cột dùng `varchar` thay vì `nvarchar`              | Kiểm tra lại DDL; chuỗi tiếng Việt phải là `nvarchar`                                                                |
| `Invalid object name 'User'`             | Quên bọc ngoặc vuông                               | Viết `[User]` trong mọi truy vấn T-SQL                                                                               |
| `QueryRunner is already released`        | Thiếu `finally { release() }`                      | Rà lại toàn bộ khối transaction                                                                                      |
| Ứng dụng treo sau vài chục request       | Cạn connection pool do quên `release()`            | Như trên                                                                                                             |

### Ứng dụng Flutter

| Triệu chứng                             | Nguyên nhân                                      | Cách khắc phục                                                            |
| --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| `Connection refused`                    | Dùng `localhost` trong trình giả lập             | Đổi sang `10.0.2.2`                                                       |
| `CLEARTEXT communication not permitted` | Android chặn HTTP                                | Thêm `network_security_config.xml` (mục 5.2)                              |
| Socket kết nối rồi ngắt ngay            | Token sai hoặc hết hạn                           | Kiểm tra `setAuth({'token': ...})` và thời hạn access token               |
| Không nhận được thông báo đẩy           | Thiếu `google-services.json` hoặc chưa cấp quyền | Chạy lại `flutterfire configure`, xin quyền `POST_NOTIFICATIONS` khi chạy |
| `MissingPluginException`                | Thêm plugin native mà không build lại            | `flutter clean` rồi `flutter run`                                         |
| Không lấy được vị trí                   | Chưa cấp quyền định vị                           | Kiểm tra quyền trong Cài đặt của thiết bị                                 |

### Trang quản trị

| Triệu chứng                       | Nguyên nhân                       | Cách khắc phục                                  |
| --------------------------------- | --------------------------------- | ----------------------------------------------- |
| Lỗi CORS                          | Origin chưa được cho phép         | Thêm `http://localhost:5173` vào `CORS_ORIGINS` |
| Socket không kết nối              | Sai `VITE_SOCKET_URL`             | Dùng URL gốc, **không** kèm `/api/v1`           |
| Thay đổi `.env` không có tác dụng | Vite chỉ đọc `.env` lúc khởi động | Dừng và chạy lại `npm run dev`                  |

---

## 10. Nội dung `.gitignore`

```gitignore
# Biến môi trường — TUYỆT ĐỐI không commit
.env
.env.local
*.env

# Khóa bí mật
**/google-services.json
**/firebase-adminsdk-*.json
**/*.p12
**/*.keystore

# Thư viện
node_modules/
backend/dist/
admin-web/dist/

# Flutter
driver-mobile/build/
driver-mobile/.dart_tool/
driver-mobile/.flutter-plugins*
driver-mobile/android/local.properties

# Công cụ
.vscode/
.idea/
*.log
.DS_Store
Thumbs.db
coverage/
```

---

## 11. Danh sách kiểm tra trước khi nộp / bảo vệ

- [ ] `npm run build` ở cả `backend` và `admin-web` chạy không lỗi
- [ ] `flutter build apk --release` chạy thành công, có file APK
- [ ] `npm run test` xanh toàn bộ
- [ ] Đã chạy đủ 24 tình huống kiểm thử trong `FEATURES.md` mục 15
- [ ] Ba truy vấn đối soát sổ cái đều cho kết quả rỗng / bằng 0
- [ ] `.env` **không** có trong lịch sử Git (`git log --all -- .env` phải rỗng)
- [ ] `README.md` có ảnh chụp màn hình các chức năng chính
- [ ] Ảnh chụp Swagger UI đã đưa vào báo cáo
- [ ] Sơ đồ Use Case, Activity, Sequence, ERD đã vẽ và chèn vào báo cáo
- [ ] Kịch bản trình diễn 11 bước ở mục 8 đã tập chạy trơn tru ít nhất một lần
