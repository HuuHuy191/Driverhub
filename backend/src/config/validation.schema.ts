import * as Joi from 'joi';

// Kiểm tra biến môi trường ngay khi khởi động — thiếu biến bắt buộc thì
// ConfigModule ném lỗi và NestFactory.create() reject, ứng dụng dừng ngay
// thay vì chạy tiếp với cấu hình thiếu (BR-01, ARCHITECTURE.md mục 9).
export const validationSchema = Joi.object({
  // ── Ứng dụng ────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),

  // ── Cơ sở dữ liệu ───────────────────────────────────────
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(1433),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_ENCRYPT: Joi.boolean().default(false),
  DB_TRUST_SERVER_CERT: Joi.boolean().default(true),

  // ── JWT ─────────────────────────────────────────────────
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES: Joi.string().default('30d'),

  // ── Cloudinary ──────────────────────────────────────────
  // Bắt buộc từ Giai đoạn 2 - module uploads/notifications
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),

  // ── Firebase (thông báo đẩy) ────────────────────────────
  // Bắt buộc từ Giai đoạn 2 - module uploads/notifications
  FIREBASE_PROJECT_ID: Joi.string().optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().optional(),

  // ── CORS ────────────────────────────────────────────────
  CORS_ORIGINS: Joi.string().required(),

  // ── Tài khoản Admin khởi tạo ────────────────────────────
  SEED_ADMIN_EMAIL: Joi.string().required(),
  SEED_ADMIN_PASSWORD: Joi.string().min(8).required(),
});
