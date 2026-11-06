# DriverHub Driver Mobile

Ứng dụng Flutter cho tài xế, kết nối với backend NestJS tại `backend/`.

## Chạy ứng dụng

```powershell
flutter pub get
flutter run
```

Mặc định ứng dụng dùng `http://10.0.2.2:3000` (Android Emulator). Với điện thoại thật,
truyền địa chỉ IP LAN của máy tính đang chạy backend:

```powershell
flutter run --dart-define=BASE_URL=http://192.168.1.15:3000
```

Backend phải đang chạy và có thể truy cập từ thiết bị. API dùng tiền tố `/api/v1`;
Socket.IO kết nối tại cùng `BASE_URL`.

## Các luồng hiện có

- Đăng nhập, đăng ký tài xế 3 bước (nhập số CCCD/GPLX và ngày cấp, không tải ảnh giấy tờ) và màn hình chờ / bị từ chối duyệt.
- Trang chính, bật/tắt ONLINE, vị trí GPS, lời mời chuyến và cập nhật realtime.
- Thực hiện chuyến, xem lịch sử và chi tiết chuyến.
- Ví, giao dịch, yêu cầu nạp tiền và thống kê thu nhập.
- Chỉnh sửa hồ sơ, ảnh đại diện và gửi lại hồ sơ bị từ chối bằng thông tin CCCD/GPLX.
- Cài đặt và đăng xuất.

Thông báo đẩy FCM chưa được tích hợp. Màn hình thông báo riêng và các chức năng Admin
không thuộc ứng dụng tài xế này.
