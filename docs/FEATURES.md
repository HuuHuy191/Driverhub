# FEATURES — Danh sách chức năng, độ ưu tiên và tiến độ

> Dùng file này làm bảng theo dõi công việc. Đánh dấu `[x]` khi hoàn thành.
>
> **Độ ưu tiên (MoSCoW):**
> **M** = Must — thiếu là đồ án không đạt · **S** = Should — thiếu thì mất điểm rõ rệt ·
> **C** = Could — làm nếu còn thời gian · **W** = Won't — xác định không làm trong phạm vi này

---

## 1. Xác thực và quản lý tài khoản

| #    | Chức năng                                   | Ưu tiên | Tác nhân | Quy tắc       | Trạng thái |
| ---- | ------------------------------------------- | :-----: | -------- | ------------- | :--------: |
| 1.3  | Đăng ký trực tiếp (email + thông tin CCCD/GPLX) | M    | Tài xế   | BR-03 → BR-06 |     ☐      |
| 1.4  | Đăng nhập, phân quyền ADMIN / DRIVER        |    M    | Cả hai   | BR-11         |     ☐      |
| 1.5  | Cấp cặp access token + refresh token        |    M    | Cả hai   | BR-12         |     ☐      |
| 1.6  | Tự làm mới token, có xoay vòng              |    S    | Cả hai   | BR-13         |     ☐      |
| 1.7  | Đăng xuất, thu hồi token                    |    M    | Cả hai   | BR-14         |     ☐      |
| 1.9  | Đổi mật khẩu khi đã đăng nhập               |    S    | Cả hai   | BR-06, BR-15  |     ☐      |
| 1.10 | Giới hạn tần suất đăng nhập                 |    S    | —        | —             |     ☐      |

---

## 2. Hồ sơ tài xế và phê duyệt

| #    | Chức năng                                       | Ưu tiên | Tác nhân | Quy tắc      | Trạng thái |
| ---- | ----------------------------------------------- | :-----: | -------- | ------------ | :--------: |
| 2.1  | Nhập số CCCD/GPLX và ngày cấp                   |    M    | Tài xế   | BR-16        |     ☐      |
| 2.2  | Xem và sửa hồ sơ cá nhân                        |    M    | Tài xế   | —            |     ☐      |
| 2.3  | Tải ảnh đại diện                                |    S    | Tài xế   | —            |     ☐      |
| 2.4  | Màn hình "Chờ duyệt" chặn mọi chức năng khác    |    M    | Tài xế   | BR-07        |     ☐      |
| 2.5  | Xem lý do bị từ chối và gửi lại hồ sơ           |    M    | Tài xế   | BR-17, BR-18 |     ☐      |
| 2.6  | Admin xem danh sách tài xế, lọc theo trạng thái |    M    | Admin    | —            |     ☐      |
| 2.7  | Admin xem thông tin CCCD/GPLX để duyệt thủ công |    M    | Admin    | BR-16        |     ☐      |
| 2.8  | Admin duyệt hồ sơ (kèm 5 tác dụng phụ)          |    M    | Admin    | BR-19        |     ☐      |
| 2.9  | Admin từ chối hồ sơ kèm lý do bắt buộc          |    M    | Admin    | BR-18        |     ☐      |
| 2.10 | Admin khóa / mở khóa tài khoản                  |    S    | Admin    | BR-21        |     ☐      |

---

## 3. Phương tiện

| #   | Chức năng                 | Ưu tiên | Tác nhân | Quy tắc | Trạng thái |
| --- | ------------------------- | :-----: | -------- | ------- | :--------: |
| 3.1 | Khai báo xe khi đăng ký   |    M    | Tài xế   | BR-22   |     ☐      |
| 3.2 | Xem danh sách xe của mình |    S    | Tài xế   | —       |     ☐      |
| 3.3 | Thêm xe thứ hai           |    C    | Tài xế   | —       |     ☐      |
| 3.4 | Đổi xe đang hoạt động     |    C    | Tài xế   | BR-23   |     ☐      |
| 3.5 | Admin duyệt / từ chối xe  |    S    | Admin    | BR-24   |     ☐      |

---

## 4. Trạng thái hoạt động và vị trí

| #   | Chức năng                                    | Ưu tiên | Tác nhân | Quy tắc | Trạng thái |
| --- | -------------------------------------------- | :-----: | -------- | ------- | :--------: |
| 4.1 | Bật / tắt ONLINE với đủ 5 điều kiện kiểm tra |    M    | Tài xế   | BR-26   |     ☐      |
| 4.2 | Gửi vị trí định kỳ 30 giây khi online        |    M    | Tài xế   | BR-27   |     ☐      |
| 4.3 | Loại tài xế có vị trí quá cũ khỏi điều phối  |    S    | Hệ thống | BR-28   |     ☐      |
| 4.4 | Chặn tắt ONLINE khi đang có chuyến           |    M    | Tài xế   | BR-30   |     ☐      |
| 4.5 | Admin xem bản đồ tài xế đang online          |    C    | Admin    | —       |     ☐      |

---

## 5. Khách hàng mô phỏng

| #   | Chức năng                        | Ưu tiên | Tác nhân | Quy tắc | Trạng thái |
| --- | -------------------------------- | :-----: | -------- | ------- | :--------: |
| 5.1 | Admin tạo khách hàng             |    M    | Admin    | —       |     ☐      |
| 5.2 | Admin xem / sửa / xóa khách hàng |    S    | Admin    | —       |     ☐      |

---

## 6. Vòng đời chuyến xe

| #    | Chức năng                                         | Ưu tiên | Tác nhân | Quy tắc | Trạng thái |
| ---- | ------------------------------------------------- | :-----: | -------- | ------- | :--------: |
| 6.1  | Tính giá cước theo công thức                      |    M    | Hệ thống | BR-36   |     ☐      |
| 6.2  | Xem trước giá trước khi tạo chuyến                |    S    | Admin    | BR-36   |     ☐      |
| 6.3  | Admin tạo chuyến (có thể ghi đè giá)              |    M    | Admin    | BR-37   |     ☐      |
| 6.4  | Sinh mã chuyến dễ đọc (`R20260918-0001`)          |    S    | Hệ thống | —       |     ☐      |
| 6.5  | **Máy trạng thái 7 trạng thái, chặn nhảy cóc**    |    M    | Hệ thống | BR-31   |     ☐      |
| 6.6  | Kiểm tra quyền sở hữu khi đổi trạng thái          |    M    | Hệ thống | BR-32   |     ☐      |
| 6.7  | `UPDATE` có điều kiện cho mọi chuyển trạng thái   |    M    | Hệ thống | BR-33   |     ☐      |
| 6.8  | Ghi nhật ký chuyển trạng thái                     |    S    | Hệ thống | BR-34   |     ☐      |
| 6.9  | Tài xế cập nhật ARRIVED → IN_PROGRESS → COMPLETED |    M    | Tài xế   | BR-31   |     ☐      |
| 6.10 | Admin theo dõi chuyến realtime                    |    M    | Admin    | —       |     ☐      |
| 6.11 | Xem chi tiết và lịch sử chuyến                    |    M    | Cả hai   | —       |     ☐      |

---

## 7. Điều phối thời gian thực

| #    | Chức năng                                    | Ưu tiên | Tác nhân | Quy tắc | Trạng thái |
| ---- | -------------------------------------------- | :-----: | -------- | ------- | :--------: |
| 7.1  | Socket.IO Gateway có xác thực JWT            |    M    | Hệ thống | —       |     ☐      |
| 7.2  | Room riêng `driver:{id}` và `admin`          |    M    | Hệ thống | —       |     ☐      |
| 7.3  | **Lọc tài xế đủ điều kiện theo 9 tiêu chí**  |    M    | Hệ thống | BR-40   |     ☐      |
| 7.4  | Sắp xếp theo khoảng cách bằng `geography`    |    M    | Hệ thống | BR-41   |     ☐      |
| 7.5  | **Điều phối theo vòng, mỗi vòng 5 tài xế**   |    M    | Hệ thống | BR-42   |     ☐      |
| 7.6  | Hết hạn lời mời sau 20 giây                  |    M    | Hệ thống | BR-42   |     ☐      |
| 7.7  | Job quét lời mời hết hạn mỗi 5 giây          |    S    | Hệ thống | BR-43   |     ☐      |
| 7.8  | Chuyển `NO_DRIVER_FOUND` sau 3 vòng          |    M    | Hệ thống | BR-42   |     ☐      |
| 7.9  | Admin điều phối lại chuyến `NO_DRIVER_FOUND` |    C    | Admin    | —       |     ☐      |
| 7.10 | Không gửi lặp lời mời cho cùng tài xế        |    M    | Hệ thống | BR-44   |     ☐      |
| 7.11 | Tài xế nhận / bỏ qua lời mời                 |    M    | Tài xế   | —       |     ☐      |
| 7.12 | **Chống tranh chấp bằng `UPDATE ... WHERE`** |    M    | Hệ thống | BR-45   |     ☐      |
| 7.13 | Gỡ lời mời khỏi màn hình khi người khác nhận |    S    | Tài xế   | —       |     ☐      |
| 7.14 | Tự động gán xe đang hoạt động                |    M    | Hệ thống | BR-46   |     ☐      |
| 7.15 | Đếm ngược thời gian còn lại trên ứng dụng    |    S    | Tài xế   | —       |     ☐      |

---

## 8. Hủy chuyến

| #   | Chức năng                                 | Ưu tiên | Tác nhân | Quy tắc      | Trạng thái |
| --- | ----------------------------------------- | :-----: | -------- | ------------ | :--------: |
| 8.1 | Admin hủy chuyến kèm lý do                |    M    | Admin    | BR-48, BR-50 |     ☐      |
| 8.2 | Tài xế hủy chuyến kèm lý do               |    M    | Tài xế   | BR-48, BR-50 |     ☐      |
| 8.3 | Chặn hủy khi đang chở khách               |    M    | Hệ thống | BR-49        |     ☐      |
| 8.4 | Tài xế hủy → điều phối lại cho người khác |    S    | Hệ thống | BR-51        |     ☐      |
| 8.5 | Ghi nhận `cancelledBy` và `cancelReason`  |    M    | Hệ thống | BR-50        |     ☐      |
| 8.6 | Đếm số lần hủy của tài xế                 |    C    | Hệ thống | BR-53        |     ☐      |

---

## 9. Ví và tài chính

| #    | Chức năng                                         | Ưu tiên | Tác nhân | Quy tắc      | Trạng thái |
| ---- | ------------------------------------------------- | :-----: | -------- | ------------ | :--------: |
| 9.1  | Tạo ví tự động khi hồ sơ được duyệt               |    M    | Hệ thống | BR-19        |     ☐      |
| 9.2  | Xem số dư ví                                      |    M    | Tài xế   | —            |     ☐      |
| 9.3  | Xem lịch sử giao dịch có phân trang               |    M    | Tài xế   | —            |     ☐      |
| 9.4  | Tính phí nền tảng theo tỷ lệ cấu hình             |    M    | Hệ thống | BR-59        |     ☐      |
| 9.5  | **Snapshot `commissionRate` vào bảng `Ride`**     |    M    | Hệ thống | BR-60        |     ☐      |
| 9.6  | Trừ phí khỏi ví khi khách trả tiền mặt            |    M    | Hệ thống | BR-61        |     ☐      |
| 9.7  | **Ghi sổ kép: ví tài xế + ví nền tảng**           |    S    | Hệ thống | BR-62        |     ☐      |
| 9.8  | **Toàn bộ quyết toán trong một transaction**      |    M    | Hệ thống | BR-63        |     ☐      |
| 9.9  | **Idempotent 2 lớp chống trừ phí lặp**            |    M    | Hệ thống | BR-64        |     ☐      |
| 9.10 | Ghi `balanceAfter` cho mỗi giao dịch              |    M    | Hệ thống | BR-57        |     ☐      |
| 9.11 | Cập nhật số dư nguyên tử bằng `balance + @amount` |    M    | Hệ thống | BR-58        |     ☐      |
| 9.12 | Chặn nhận chuyến khi ví âm vượt ngưỡng            |    S    | Hệ thống | BR-67        |     ☐      |
| 9.13 | Tự đặt offline khi ví vượt ngưỡng                 |    C    | Hệ thống | BR-67        |     ☐      |
| 9.14 | Tài xế tạo yêu cầu nạp tiền                       |    S    | Tài xế   | BR-68, BR-69 |     ☐      |
| 9.15 | Admin duyệt / từ chối nạp tiền                    |    S    | Admin    | BR-68        |     ☐      |
| 9.16 | Chặn tạo yêu cầu nạp thứ hai                      |    C    | Hệ thống | BR-70        |     ☐      |
| 9.17 | Admin xem ví nền tảng và doanh thu                |    S    | Admin    | —            |     ☐      |

---

## 10. Thông báo

| #    | Chức năng                               | Ưu tiên | Tác nhân | Quy tắc | Trạng thái |
| ---- | --------------------------------------- | :-----: | -------- | ------- | :--------: |
| 10.1 | Thông báo realtime qua Socket.IO        |    M    | Cả hai   | BR-71   |     ☐      |
| 10.2 | **Thông báo đẩy FCM khi app chạy nền**  |    S    | Tài xế   | BR-72   |     ☐      |
| 10.3 | Rung và phát âm thanh khi có chuyến mới |    S    | Tài xế   | —       |     ☐      |
| 10.4 | Chống hiển thị trùng Socket / FCM       |    C    | Tài xế   | BR-73   |     ☐      |
| 10.5 | Danh sách thông báo trong ứng dụng      |    C    | Cả hai   | BR-74   |     ☐      |

---

## 11. Thống kê và báo cáo

| #    | Chức năng                            | Ưu tiên | Tác nhân | Quy tắc      | Trạng thái |
| ---- | ------------------------------------ | :-----: | -------- | ------------ | :--------: |
| 11.1 | Dashboard tổng quan cho Admin        |    S    | Admin    | —            |     ☐      |
| 11.2 | Thu nhập tài xế theo ngày            |    S    | Tài xế   | —            |     ☐      |
| 11.3 | Doanh thu nền tảng theo tháng        |    S    | Admin    | —            |     ☐      |
| 11.4 | Biểu đồ hiệu quả điều phối theo vòng |    C    | Admin    | —            |     ☐      |
| 11.5 | Truy vấn đối soát toàn vẹn sổ cái    |    S    | —        | BR-57, BR-62 |     ☐      |

---

## 12. Cấu hình hệ thống

| #    | Chức năng                                | Ưu tiên | Tác nhân | Quy tắc      | Trạng thái |
| ---- | ---------------------------------------- | :-----: | -------- | ------------ | :--------: |
| 12.1 | Nạp cấu hình từ `SystemConfig`, có cache |    M    | Hệ thống | BR-01, BR-02 |     ☐      |
| 12.2 | Admin xem và sửa tham số cấu hình        |    S    | Admin    | BR-01        |     ☐      |

---

## 13. Ngoài phạm vi (Won't)

| Chức năng                                          | Lý do                        |
| -------------------------------------------------- | ---------------------------- |
| Ứng dụng dành cho khách hàng                       | Đề tài tập trung phía tài xế |
| Cổng thanh toán thật (VNPay, MoMo)                 | Cần tài khoản doanh nghiệp   |
| Dẫn đường turn-by-turn                             | Vượt quy mô đồ án            |
| Đánh giá và chấm sao chuyến đi                     | Không có ứng dụng khách hàng |
| Ghép chuyến, đặt trước, giá động theo giờ cao điểm | Vượt quy mô                  |
| Chat giữa tài xế và khách hàng                     | Vượt quy mô                  |
| Redis adapter cho nhiều instance Socket.IO         | Hệ thống chạy một tiến trình |
| Nút khẩn cấp SOS                                   | Vượt quy mô                  |

---

## 14. Danh mục màn hình

### 14.1. Ứng dụng tài xế (Flutter)

| #   | Màn hình                          | Ưu tiên | Nội dung chính                                               | Trạng thái |
| --- | --------------------------------- | :-----: | ------------------------------------------------------------ | :--------: |
| D01 | Khởi động (Splash)                |    M    | Kiểm tra token, điều hướng                                   |    [x]     |
| D02 | Đăng nhập                         |    M    | Email và mật khẩu                                            |    [x]     |
| D03 | Đăng ký — bước 1                  |    M    | Nhập email đăng nhập                                         |    [x]     |
| D04 | Đăng ký — bước 2                  |    M    | Thông tin cá nhân, CCCD và ngày cấp                         |    [x]     |
| D05 | Đăng ký — bước 3                  |    M    | Thông tin xe, GPLX và ngày cấp                              |    [x]     |
| D06 | Gửi hồ sơ đăng ký                 |    M    | Gửi thông tin để Admin kiểm tra thủ công, không tải ảnh     |    [x]     |
| D08 | Chờ duyệt                         |    M    | Trạng thái hồ sơ (`PENDING` / `REJECTED`)                    |    [x]     |
| D10 | **Trang chính**                   |    M    | Công tắc ONLINE, bản đồ, ví tóm tắt, thống kê hôm nay        |    [x]     |
| D11 | **Lời mời chuyến (dạng bật lên)** |    M    | Thông tin chuyến, đếm ngược, nút Nhận / Bỏ qua               |    [x]     |
| D12 | **Chuyến đang thực hiện**         |    M    | Bản đồ, thông tin khách, nút chuyển trạng thái, nút gọi điện |    [x]     |
| D13 | Hoàn thành chuyến                 |    M    | Tóm tắt cước, phí nền tảng, thu nhập ròng                    |    [x]     |
| D14 | Lịch sử chuyến                    |    M    | Danh sách có lọc theo ngày                                   |    [x]     |
| D15 | Chi tiết chuyến                   |    S    | Toàn bộ thông tin + mốc thời gian                            |    [x]     |
| D16 | **Ví**                            |    M    | Số dư, cảnh báo ngưỡng, nút nạp tiền                         |    [x]     |
| D17 | Lịch sử giao dịch                 |    M    | Danh sách, lọc theo loại                                     |    [x]     |
| D18 | Nạp tiền                          |    S    | Nhập số tiền, tải ảnh biên lai                               |    [x]     |
| D19 | Thống kê thu nhập                 |    S    | Biểu đồ theo ngày / tuần                                     |    [x]     |
| D20 | Hồ sơ cá nhân                     |    M    | Thông tin, CCCD/GPLX, ảnh đại diện, thông tin xe             |    [x]     |
| D21 | Thông báo                         |    C    | Danh sách, đánh dấu đã đọc, cập nhật qua Socket.IO           |    [x]     |
| D22 | Cài đặt                           |    C    | Đổi mật khẩu, đăng xuất, thông tin ứng dụng                  |    [x]     |

### 14.2. Trang quản trị (React)

| #   | Màn hình                        | Ưu tiên | Nội dung chính                                          | Trạng thái |
| --- | ------------------------------- | :-----: | ------------------------------------------------------- | :--------: |
| A01 | Đăng nhập                       |    M    | Email, mật khẩu                                         |    [x]     |
| A02 | **Dashboard**                   |    S    | Thẻ số liệu, thống kê điều phối                         |    [x]     |
| A03 | **Danh sách tài xế**            |    M    | Bảng, lọc theo trạng thái duyệt / online                |    [x]     |
| A04 | **Chi tiết tài xế**             |    M    | Hồ sơ, ảnh giấy tờ, duyệt/từ chối, khóa/mở khóa        |    [x]     |
| A05 | Khách hàng                      |    M    | CRUD khách hàng mô phỏng                                |    [x]     |
| A06 | **Tạo chuyến xe**               |    M    | Form + bản đồ chọn điểm + xem trước giá                 |    [x]     |
| A07 | **Danh sách chuyến (realtime)** |    M    | Bảng tự cập nhật, lọc theo trạng thái                   |    [x]     |
| A08 | Chi tiết chuyến                 |    M    | Thông tin, nhật ký trạng thái, lời mời, hủy/điều phối lại |    [x]     |
| A09 | Bản đồ giám sát                 |    C    | Vị trí tài xế online qua Socket.IO                      |    [x]     |
| A10 | Ví nền tảng                     |    S    | Số dư, doanh thu theo kỳ                                |    [x]     |
| A11 | Duyệt nạp tiền                  |    S    | Danh sách yêu cầu, ảnh biên lai                         |    [x]     |
| A12 | Cấu hình hệ thống               |    S    | Sửa tham số `SystemConfig`                              |    [x]     |

---

## 15. Kế hoạch kiểm thử

### 15.1. Các tình huống bắt buộc phải kiểm thử

| #   | Tình huống                                                  | Kết quả mong đợi                                                                                                         | Quy tắc             | Trạng thái |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------- | :--------: |
| T01 | **Hai tài xế bấm nhận cùng một chuyến đồng thời**           | Đúng một người nhận `200`, người kia nhận `409 RIDE_ALREADY_TAKEN`. Chuyến chỉ có một `driverId`                         | BR-45               |     ☐      |
| T02 | **Gọi API hoàn thành chuyến hai lần liên tiếp**             | Lần hai trả `409`. Ví **chỉ bị trừ một lần**. Bảng `WalletTransaction` chỉ có một bản ghi `COMMISSION_FEE` cho chuyến đó | BR-64               |     ☐      |
| T03 | Tài xế offline                                              | Không nhận được bất kỳ lời mời nào                                                                                       | BR-40               |     ☐      |
| T04 | Tài xế đang có chuyến `IN_PROGRESS`                         | Bị loại khỏi danh sách điều phối chuyến mới                                                                              | BR-40               |     ☐      |
| T05 | Tài xế có vị trí cũ hơn 5 phút                              | Bị loại khỏi điều phối dù `isOnline = 1`                                                                                 | BR-28               |     ☐      |
| T06 | **Không tài xế nào nhận sau 3 vòng**                        | Chuyến → `NO_DRIVER_FOUND`, toàn bộ offer → `EXPIRED`, Admin nhận thông báo                                              | BR-42               |     ☐      |
| T07 | Gửi `PATCH status = COMPLETED` khi chuyến đang ở `ACCEPTED` | `409 INVALID_STATE_TRANSITION`, không phát sinh giao dịch ví                                                             | BR-31               |     ☐      |
| T08 | Tài xế B cố cập nhật chuyến của tài xế A                    | `403 NOT_RIDE_OWNER`                                                                                                     | BR-32               |     ☐      |
| T09 | **Hoàn thành chuyến tiền mặt 100.000đ**                     | `platformFee = 10.000`, `driverEarning = 90.000`, ví tài xế giảm 10.000, ví nền tảng tăng 10.000                         | BR-59, BR-61, BR-62 |     ☐      |
| T10 | **Gây lỗi giữa transaction quyết toán** (ngắt kết nối CSDL) | Rollback toàn bộ: chuyến vẫn `IN_PROGRESS`, ví không đổi, không có bản ghi giao dịch                                     | BR-65               |     ☐      |
| T11 | Hủy chuyến ở trạng thái `ACCEPTED`                          | Không phát sinh giao dịch ví nào                                                                                         | BR-52               |     ☐      |
| T12 | Hủy chuyến ở trạng thái `IN_PROGRESS`                       | `409 CANNOT_CANCEL_IN_PROGRESS`                                                                                          | BR-49               |     ☐      |
| T13 | Tài xế hủy chuyến đã nhận                                   | Chuyến về `SEARCHING`, điều phối lại, tài xế vừa hủy không nhận lại lời mời                                              | BR-51, BR-44        |     ☐      |
| T14 | Ví âm vượt ngưỡng `-200.000đ`                               | Không bật được ONLINE, bị loại khỏi điều phối                                                                            | BR-67               |     ☐      |
| T15 | Tài xế chưa duyệt gọi API nghiệp vụ                         | `403 ACCOUNT_NOT_APPROVED`                                                                                               | BR-07               |     ☐      |
| T18 | Dùng lại một refresh token đã bị thu hồi                    | `401` và **toàn bộ** phiên của tài khoản bị thu hồi                                                                      | BR-13               |     ☐      |
| T19 | Kết nối Socket không kèm token                              | Bị ngắt kết nối ngay lập tức                                                                                             | —                   |     ☐      |
| T20 | Đổi `COMMISSION_RATE` từ 10% sang 15%                       | Chuyến hoàn thành **trước** đó vẫn báo cáo theo 10%                                                                      | BR-60               |     ☐      |
| T21 | Từ chối hồ sơ mà không nhập lý do                           | `400 REJECT_REASON_REQUIRED`                                                                                             | BR-18               |     ☐      |
| T22 | Thêm xe thứ hai và đặt làm xe hoạt động                     | Xe cũ tự chuyển `isActive = 0`, filtered index không bị vi phạm                                                          | BR-23               |     ☐      |
| T23 | Đăng ký với biển số xe đã tồn tại                           | `409 LICENSE_PLATE_EXISTS`                                                                                               | BR-22               |     ☐      |
| T24 | Chạy 3 truy vấn đối soát sổ cái sau khi kiểm thử            | Cả ba trả về kết quả rỗng / bằng 0                                                                                       | BR-57, BR-62, BR-64 |     ☐      |
| T25 | Tài xế xem lịch sử / chi tiết chuyến và gửi lại hồ sơ       | Chỉ thấy chuyến thuộc quyền sở hữu; hồ sơ REJECTED chỉ chuyển PENDING khi đủ thông tin CCCD/GPLX                       | BR-17, BR-32       |     ☐      |

### 15.2. Cách mô phỏng tranh chấp đồng thời (T01, T02)

```bash
# T01 — hai tài xế nhận cùng lúc
curl -X POST http://localhost:3000/api/v1/rides/$RIDE_ID/accept \
     -H "Authorization: Bearer $TOKEN_DRIVER_A" &
curl -X POST http://localhost:3000/api/v1/rides/$RIDE_ID/accept \
     -H "Authorization: Bearer $TOKEN_DRIVER_B" &
wait
# Kết quả mong đợi: một lần 200, một lần 409
```

```typescript
// T02 — kiểm thử tự động bằng Jest
it("không trừ phí hai lần khi gọi complete lặp lại (BR-64)", async () => {
  const [first, second] = await Promise.all([
    request(app)
      .patch(`/api/v1/rides/${rideId}/status`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ status: "COMPLETED" }),
    request(app)
      .patch(`/api/v1/rides/${rideId}/status`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ status: "COMPLETED" }),
  ]);

  const codes = [first.status, second.status].sort();
  expect(codes).toEqual([200, 409]);

  const txs = await walletTxRepo.find({
    where: { rideId, type: "COMMISSION_FEE" },
  });
  expect(txs).toHaveLength(1); // chỉ một bút toán phí
  expect(wallet.balance).toBe(-platformFee); // trừ đúng một lần
});
```

### 15.3. Phạm vi kiểm thử theo tầng

| Loại              | Đối tượng                                                              | Công cụ                      | Mức bao phủ mục tiêu       |
| ----------------- | ---------------------------------------------------------------------- | ---------------------------- | -------------------------- |
| Unit test         | `FareCalculator`, `RideStateMachine`, `WalletService.applyTransaction` | Jest                         | ≥ 80%                      |
| Integration test  | Toàn bộ vòng đời chuyến, quyết toán ví, luồng đăng ký                  | Jest + Supertest + CSDL test | Các tình huống T01 → T24   |
| Kiểm thử thủ công | Ứng dụng Flutter trên máy thật, trang Admin                            | —                            | Toàn bộ danh mục màn hình  |
| Kiểm thử tải nhẹ  | 50 lời mời đồng thời                                                   | autocannon                   | Thời gian phản hồi < 500ms |

---

## 16. Bảng theo dõi tiến độ tổng thể

| Nhóm                    |  Must  | Should | Could  |  Tổng  | Hoàn thành |
| ----------------------- | :----: | :----: | :----: | :----: | :--------: |
| 1. Xác thực             |   6    |   4    |   0    |   10   |     0      |
| 2. Hồ sơ tài xế         |   7    |   3    |   0    |   10   |     0      |
| 3. Phương tiện          |   1    |   2    |   2    |   5    |     0      |
| 4. Trạng thái hoạt động |   3    |   1    |   1    |   5    |     0      |
| 5. Khách hàng           |   1    |   1    |   0    |   2    |     0      |
| 6. Vòng đời chuyến      |   8    |   3    |   0    |   11   |     0      |
| 7. Điều phối realtime   |   10   |   4    |   1    |   15   |     0      |
| 8. Hủy chuyến           |   4    |   1    |   1    |   6    |     0      |
| 9. Ví và tài chính      |   9    |   6    |   2    |   17   |     0      |
| 10. Thông báo           |   1    |   2    |   2    |   5    |     0      |
| 11. Thống kê            |   0    |   4    |   1    |   5    |     0      |
| 12. Cấu hình            |   1    |   1    |   0    |   2    |     0      |
| **Tổng**                | **51** | **32** | **10** | **93** |   **0**    |

> **Nguyên tắc ưu tiên khi thiếu thời gian:** hoàn thành **toàn bộ 51 mục Must** trước, rồi
> mới làm Should. Một hệ thống làm đúng và đủ phần lõi luôn được đánh giá cao hơn một hệ
> thống nhiều chức năng nhưng phần lõi lỏng lẻo.
