const path = require('path');
const { config } = require('dotenv');

// Chạy trước mỗi test file (Jest setupFiles) — nạp .env.test với override:true
// để ConfigModule.forRoot() (app.module.ts, mặc định đọc .env) không ghi đè
// lại process.env đã có, giữ đúng CSDL DriverHub_Test cho toàn bộ e2e.
config({
  path: path.resolve(__dirname, '../.env.test'),
  override: true,
  quiet: true,
});
