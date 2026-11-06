# PROJECT OVERVIEW — Ứng dụng dành cho tài xế công nghệ

> Tài liệu tổng quan dự án. Đọc file này trước tiên.

---

## 1. Thông tin đề tài

| Mục                      | Nội dung                                                      |
| ------------------------ | ------------------------------------------------------------- |
| **Tên đề tài**           | Xây dựng ứng dụng dành cho tài xế công nghệ                   |
| **Tên hệ thống**         | DriverHub — Hệ thống điều phối chuyến xe cho tài xế công nghệ |
| **Môn học**              | Đồ án cơ sở Công nghệ Thông tin — 1-1-26 (N01).TH             |
| **Sinh viên**            | Nguyễn Hữu Huy — MSV 23010240 — K17-CNTT3                     |
| **Giảng viên hướng dẫn** | Trịnh Thăng Bình                                              |
| **Trường**               | Trường Công nghệ Thông tin — Đại học Phenikaa                 |

> **Lưu ý về cách gọi tên:** toàn bộ tài liệu thống nhất dùng **một tên đề tài duy nhất**
> là _"Xây dựng ứng dụng dành cho tài xế công nghệ"_. Không dùng song song tên
> _"Hệ thống mô phỏng điều phối chuyến xe"_. Toàn bộ tài liệu xưng **"sinh viên thực hiện"**
> (đồ án cá nhân), không xưng "nhóm".

---

## 2. Lý do chọn đề tài

Dịch vụ vận tải công nghệ đã trở thành hạ tầng quen thuộc trong đời sống. Phía sau một
thao tác "đặt xe" đơn giản là một chuỗi nghiệp vụ phức tạp: xác thực và phê duyệt đối tác
tài xế, điều phối chuyến theo thời gian thực, quản lý vòng đời trạng thái chuyến đi, và xử
lý dòng tiền giữa nền tảng với tài xế.

Đề tài tập trung vào **phía tài xế** — phần ít được mô phỏng trong các đồ án sinh viên
nhưng lại chứa những bài toán kỹ thuật đáng giá nhất:

- **Điều phối thời gian thực (real-time dispatch):** chọn đúng tài xế, gửi đúng lúc, xử lý
  trường hợp không ai nhận.
- **Tranh chấp đồng thời (race condition):** nhiều tài xế bấm nhận cùng một chuyến trong
  cùng một khoảnh khắc.
- **Toàn vẹn dữ liệu tài chính:** trừ phí nền tảng phải đúng một lần, không thừa không thiếu,
  kể cả khi mạng chập chờn và client gọi lại API.
- **Máy trạng thái (state machine):** chuyến xe chỉ được đi theo những lối chuyển hợp lệ.

Thông qua đề tài, sinh viên áp dụng kiến thức về phát triển ứng dụng di động, phát triển web,
thiết kế REST API, lập trình realtime, thiết kế cơ sở dữ liệu quan hệ và xử lý giao dịch
tài chính vào một hệ thống có quy trình nghiệp vụ rõ ràng.

---

## 3. Mục tiêu

### 3.1. Mục tiêu tổng quát

Xây dựng một hệ thống hoàn chỉnh gồm **ứng dụng di động cho tài xế**, **trang quản trị web**
và **backend trung tâm**, mô phỏng đầy đủ vòng đời của một chuyến xe công nghệ từ lúc phát
sinh nhu cầu đến lúc quyết toán tiền vào ví tài xế.

### 3.2. Mục tiêu cụ thể

**Nhóm mục tiêu về tài khoản và hồ sơ**

1. Đăng ký tài khoản tài xế trực tiếp bằng email, không yêu cầu OTP.
2. Tải lên và lưu trữ giấy tờ đối tác (CCCD, giấy phép lái xe, đăng ký xe).
3. Quy trình Admin duyệt / từ chối hồ sơ tài xế kèm lý do.
4. Đăng nhập và phân quyền theo vai trò (ADMIN / DRIVER).
5. Cơ chế phiên đăng nhập dài hạn cho mobile bằng access token + refresh token.

**Nhóm mục tiêu về điều phối chuyến**

6. Tài xế bật / tắt trạng thái sẵn sàng nhận chuyến.
7. Admin tạo chuyến xe mô phỏng (khách hàng, điểm đón, điểm trả, quãng đường).
8. Hệ thống tự động tính giá cước dự kiến theo công thức.
9. Thuật toán điều phối chọn tài xế theo khoảng cách, gửi theo nhiều vòng, có thời gian
   chờ và cơ chế hết hạn lời mời.
10. Tài xế nhận hoặc bỏ qua chuyến; đảm bảo chỉ **một** tài xế nhận thành công.
11. Tài xế cập nhật trạng thái chuyến theo máy trạng thái đã định nghĩa.
12. Nghiệp vụ hủy chuyến cho cả Admin và tài xế, có ghi nhận người hủy và lý do.
13. Admin theo dõi toàn bộ chuyến xe theo thời gian thực.

**Nhóm mục tiêu về tài chính**

14. Ví điện tử cho tài xế, cho phép số dư âm trong giới hạn.
15. Tính và thu phí nền tảng theo tỷ lệ cấu hình được (mặc định 10%).
16. Ghi nhận toàn bộ lịch sử giao dịch ví, có số dư sau mỗi giao dịch.
17. Nghiệp vụ nạp tiền vào ví do Admin duyệt.
18. Chặn tài xế nhận chuyến khi ví âm vượt ngưỡng cho phép.
19. Đảm bảo mọi thao tác tiền bạc chạy trong transaction và **idempotent**.

**Nhóm mục tiêu về chất lượng**

20. Mật khẩu được băm một chiều bằng bcrypt.
21. Xác thực cho cả REST API và kết nối WebSocket.
22. Tài liệu API tự sinh bằng Swagger.
23. Bộ kiểm thử cho các tình huống nghiệp vụ trọng yếu.

---

## 4. Phạm vi

### 4.1. Tác nhân của hệ thống

| Tác nhân              | Nền tảng         | Vai trò                                                                                                                      |
| --------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Admin**             | Web (React)      | Quản trị viên nền tảng: duyệt hồ sơ tài xế, tạo chuyến mô phỏng, theo dõi điều phối, duyệt yêu cầu nạp ví, cấu hình hệ thống |
| **Tài xế (Driver)**   | Mobile (Flutter) | Đối tác vận tải: đăng ký, nhận chuyến, thực hiện chuyến, theo dõi thu nhập và ví                                             |
| **Hệ thống (System)** | Backend          | Tác nhân tự động: điều phối chuyến, quét lời mời hết hạn, tính toán và ghi nhận giao dịch ví                                 |

### 4.2. Nằm trong phạm vi

- Ứng dụng di động Flutter dành cho tài xế (Android).
- Trang quản trị web React dành cho Admin.
- Backend NestJS cung cấp REST API và WebSocket.
- Cơ sở dữ liệu SQL Server.
- Điều phối chuyến theo thời gian thực qua Socket.IO.
- Thông báo đẩy khi ứng dụng chạy nền qua Firebase Cloud Messaging.
- Bản đồ hiển thị điểm đón / điểm trả bằng OpenStreetMap.
- Ví tài xế, phí nền tảng, lịch sử giao dịch.

### 4.3. Nằm ngoài phạm vi (giới hạn có chủ đích)

| Giới hạn                                              | Lý do                                                                                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Không xây dựng ứng dụng cho khách hàng**            | Đề tài tập trung phía tài xế. Dữ liệu khách hàng và chuyến xe do Admin tạo để mô phỏng nhu cầu                         |
| **Không tích hợp cổng thanh toán thật**               | Toàn bộ chuyến ở giai đoạn này dùng phương thức tiền mặt (`CASH`). Việc nạp ví được mô phỏng qua quy trình Admin duyệt |
| **Không dẫn đường turn-by-turn**                      | Chỉ hiển thị điểm đón / điểm trả trên bản đồ, không tính lộ trình chi tiết                                             |
| **Không theo dõi GPS liên tục**                       | Ứng dụng chỉ gửi vị trí định kỳ (30 giây/lần) khi tài xế đang online, đủ để phục vụ điều phối theo khoảng cách         |
| **Không có hệ thống khiếu nại / chăm sóc khách hàng** | Vượt quy mô đồ án                                                                                                      |
| **Không triển khai lên hạ tầng production**           | Hệ thống chạy ở môi trường phát triển cục bộ                                                                           |

---

## 5. Kết quả dự kiến

Sau khi hoàn thành, hệ thống mô phỏng được trọn vẹn luồng nghiệp vụ sau:

```
Tài xế đăng ký tài khoản + nhập số CCCD/GPLX và ngày cấp
            |
            v
Admin duyệt hồ sơ  --(từ chối)-->  Tài xế nhận lý do, bổ sung lại
            |
            v (duyệt)
Ví tài xế được khởi tạo với số dư 0
            |
            v
Tài xế đăng nhập -> bật trạng thái ONLINE -> gửi vị trí định kỳ
            |
            v
Admin tạo chuyến xe (khách, điểm đón, điểm trả, quãng đường)
            |
            v
Backend tính giá cước dự kiến -> lưu chuyến ở trạng thái SEARCHING
            |
            v
Thuật toán điều phối: lọc tài xế đủ điều kiện, sắp xếp theo khoảng cách
            |
            v
Gửi lời mời vòng 1 (5 tài xế gần nhất) qua Socket.IO + FCM
            |
            +--(không ai nhận sau 20 giây)--> Vòng 2 -> Vòng 3 -> NO_DRIVER_FOUND
            |
            v (một tài xế bấm nhận)
Backend dùng UPDATE có điều kiện -> chỉ một tài xế thắng, còn lại nhận 409
            |
            v
Chuyến chuyển ACCEPTED -> ARRIVED -> IN_PROGRESS -> COMPLETED
            |
            v
Trong một transaction duy nhất:
  - Chốt giá cuối (finalFare)
  - Snapshot tỷ lệ phí tại thời điểm hoàn thành
  - Tính phí nền tảng và thu nhập ròng
  - Trừ phí khỏi ví tài xế (do khách trả tiền mặt)
  - Ghi bút toán vào lịch sử giao dịch
  - Cộng phí vào ví nền tảng
            |
            v
Tài xế xem ví và lịch sử thu nhập - Admin xem báo cáo doanh thu
```

Hệ thống đồng thời chứng minh được ba năng lực kỹ thuật:

1. **Giao tiếp thời gian thực hai chiều** giữa backend và ứng dụng di động.
2. **Xử lý tranh chấp đồng thời** đúng đắn ở tầng cơ sở dữ liệu.
3. **Toàn vẹn dữ liệu tài chính** qua transaction và thiết kế idempotent.

---

## 6. Cấu trúc kho mã nguồn

```
driverhub/
├── CLAUDE.md                  # Hướng dẫn cho Claude Code
├── README.md
├── docker-compose.yml         # SQL Server cho môi trường phát triển
│
├── backend/                   # NestJS + TypeScript
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/            # Guard, Interceptor, Filter, Decorator dùng chung
│   │   ├── config/            # Cấu hình đọc từ biến môi trường
│   │   ├── database/          # DataSource, migration, seed
│   │   └── modules/
│   │       ├── auth/          # Đăng nhập, đăng ký, refresh token
│   │       ├── users/
│   │       ├── drivers/       # Hồ sơ, giấy tờ, duyệt, trạng thái online
│   │       ├── vehicles/
│   │       ├── customers/
│   │       ├── rides/         # Vòng đời chuyến xe, máy trạng thái
│   │       ├── dispatch/      # Thuật toán điều phối, job quét hết hạn
│   │       ├── wallets/       # Ví, giao dịch, nạp tiền
│   │       ├── realtime/      # Socket.IO Gateway
│   │       ├── notifications/ # Firebase Cloud Messaging
│   │       ├── uploads/       # Cloudinary
│   │       └── settings/      # Cấu hình hệ thống động
│   └── test/
│
├── admin-web/                 # React + TypeScript + Vite
│   └── src/
│       ├── api/               # Lớp gọi API
│       ├── components/
│       ├── features/          # auth, drivers, rides, wallets, settings
│       ├── hooks/
│       ├── lib/               # socket client, formatters
│       └── pages/
│
├── driver-mobile/             # Flutter + Dart
│   └── lib/
│       ├── main.dart
│       ├── core/              # theme, hằng số, tiện ích, xử lý lỗi
│       ├── data/              # model, datasource, repository
│       ├── features/          # auth, home, ride, wallet, profile
│       └── services/          # api_client, socket_service, fcm_service, location_service
│
└── docs/
    ├── PROJECT-OVERVIEW.md    # <- đang đọc
    ├── BUSINESS-RULES.md      # Quy tắc nghiệp vụ (quan trọng nhất)
    ├── ARCHITECTURE.md        # Kiến trúc hệ thống
    ├── DATABASE.md            # Thiết kế cơ sở dữ liệu + DDL
    ├── API.md                 # Đặc tả REST API và sự kiện Socket
    ├── FEATURES.md            # Danh sách chức năng và tiến độ
    └── SETUP.md               # Hướng dẫn cài đặt và chạy
```

---

## 7. Kế hoạch triển khai

| Giai đoạn                               | Nội dung                                                                                                                     | Kết quả bàn giao                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **GĐ 1** — Nền tảng dữ liệu và xác thực | Thiết kế CSDL, dựng migration, seed dữ liệu mẫu, xây dựng module auth (đăng ký, đăng nhập, refresh token, phân quyền) | Backend chạy được, Swagger có nhóm `/auth`, CSDL đầy đủ bảng |
| **GĐ 2** — Hồ sơ tài xế và quản trị     | Tải giấy tờ lên Cloudinary, quy trình duyệt hồ sơ, trang Admin React (đăng nhập, danh sách tài xế, duyệt / từ chối)          | Admin duyệt được tài xế từ đầu đến cuối                      |
| **GĐ 3** — Vòng đời chuyến xe           | Máy trạng thái chuyến, API tạo chuyến, tính giá cước, nhận chuyến với `UPDATE` có điều kiện, cập nhật trạng thái, hủy chuyến | Toàn bộ vòng đời chuyến chạy được qua Swagger / Postman      |
| **GĐ 4** — Ứng dụng tài xế              | Flutter: đăng nhập, bật/tắt online, bản đồ, danh sách chuyến, chi tiết chuyến, cập nhật trạng thái                           | App Flutter hoàn thành luồng chuyến (chưa realtime)          |
| **GĐ 5** — Điều phối thời gian thực     | Socket.IO Gateway có xác thực, thuật toán điều phối nhiều vòng, job quét lời mời hết hạn, tích hợp FCM                       | Admin tạo chuyến → điện thoại tài xế rung trong 1 giây       |
| **GĐ 6** — Ví và quyết toán             | Ví, giao dịch, transaction quyết toán idempotent, nạp tiền, ngưỡng ví âm, màn hình ví trên Flutter                           | Hoàn thành chuyến → ví bị trừ đúng 10%, không trừ lặp        |
| **GĐ 7** — Kiểm thử và hoàn thiện       | Kiểm thử các tình huống trọng yếu (xem `FEATURES.md` mục Kiểm thử), làm mượt giao diện, viết báo cáo                         | Hệ thống sẵn sàng bảo vệ                                     |

---

## 8. Điều hướng tài liệu

| Bạn muốn biết                                                  | Đọc file                                   |
| -------------------------------------------------------------- | ------------------------------------------ |
| Quy tắc nghiệp vụ, máy trạng thái, công thức tính tiền         | [`BUSINESS-RULES.md`](./BUSINESS-RULES.md) |
| Kiến trúc, phân tầng, luồng dữ liệu, cấu trúc module           | [`ARCHITECTURE.md`](./ARCHITECTURE.md)     |
| Bảng, cột, ràng buộc, chỉ mục, script DDL                      | [`DATABASE.md`](./DATABASE.md)             |
| Danh sách endpoint, định dạng request/response, sự kiện Socket | [`API.md`](./API.md)                       |
| Danh sách chức năng, độ ưu tiên, tiến độ, ca kiểm thử          | [`FEATURES.md`](./FEATURES.md)             |
| Cách cài đặt môi trường và chạy dự án                          | [`SETUP.md`](./SETUP.md)                   |
