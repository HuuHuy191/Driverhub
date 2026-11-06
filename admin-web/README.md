# DriverHub Admin Web

Trang quản trị React 18 dùng Vite, TypeScript, Ant Design, TanStack Query và
Socket.IO để gọi backend tại `/api/v1`.

## Chạy ứng dụng

1. Cài dependency từ thư mục này bằng `npm install`.
2. Khởi chạy backend DriverHub trên cổng `3000`.
3. Chạy `npm run dev`, sau đó mở URL Vite (mặc định `http://localhost:5173`).
4. Đăng nhập bằng tài khoản có role `ADMIN`.

Vite proxy `/api` và `/socket.io` tới `http://localhost:3000`. Có thể cấu hình
`VITE_API_URL` (mặc định `/api/v1`) và `VITE_SOCKET_URL` khi triển khai qua
origin riêng; origin đó cần được backend cho phép trong cấu hình CORS.

## Các màn hình

- Dashboard và thống kê vòng điều phối.
- Tìm kiếm, duyệt/từ chối hồ sơ tài xế; xem giấy tờ và khóa/mở khóa tài khoản.
- CRUD khách hàng mô phỏng.
- Tạo chuyến, ước tính giá, chọn tọa độ OpenStreetMap; theo dõi danh sách và chi tiết
  chuyến, hủy hoặc điều phối lại theo trạng thái backend.
- Bản đồ tài xế online, ví nền tảng, duyệt yêu cầu nạp tiền và chỉnh tham số hệ thống.

Các danh sách truy vấn API có phân trang. Dashboard, chuyến xe và vị trí tài xế được
làm mới qua sự kiện Socket.IO và/hoặc polling dự phòng.

## Kiểm tra

- `npm run build` — TypeScript và production build.
- `npm run lint` — Oxlint.
