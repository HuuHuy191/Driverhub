const path = require('path');
const { execSync } = require('child_process');
const { config } = require('dotenv');

// Chạy MỘT LẦN trước toàn bộ e2e (Jest globalSetup): đảm bảo DriverHub_Test
// có đủ schema (migration) + SystemConfig (seed-config, BR-01) trước khi bất
// kỳ test nào chạy — thiếu SystemConfig thì SettingsService.getNumber() throw,
// các test quyết toán (T02/T09, ...) sẽ sai. Idempotent: migration/seed đều
// an toàn khi chạy lặp lại (typeorm tự theo dõi migration đã áp dụng,
// seed-config dùng upsert theo "key").
//
// Yêu cầu trước: database DriverHub_Test đã tồn tại trên SQL Server — script
// này KHÔNG tự tạo database mới.
module.exports = async function globalSetup() {
  config({
    path: path.resolve(__dirname, '../.env.test'),
    override: true,
    quiet: true,
  });

  if (!process.env.DB_DATABASE?.endsWith('_Test')) {
    throw new Error(
      'E2E stopped: DB_DATABASE in backend/.env.test must end with "_Test".',
    );
  }

  const backendDir = path.resolve(__dirname, '..');
  const run = (cmd) =>
    execSync(cmd, { cwd: backendDir, env: process.env, stdio: 'inherit' });

  run('npm run migration:run');
  run('npm run seed:config');
  // seed-admin.ts đã idempotent sẵn (bỏ qua nếu email đã tồn tại) và tự tạo
  // Wallet balance=0 cho Admin — chính là "ví nền tảng" (WalletService.
  // findPlatformWallet() = ví của User role=ADMIN cũ nhất) mà các test quyết
  // toán (T02, T09, ...) cần có sẵn trước khi chạy.
  run('npm run seed:admin');
};
