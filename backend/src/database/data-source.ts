import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

// TypeORM CLI chạy ngoài vòng đời Nest nên không có ConfigModule —
// phải tự nạp .env và tự kiểm tra biến bắt buộc tại đây.
config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${key}`);
  }
  return value;
};

export const dataSourceOptions: DataSourceOptions = {
  type: 'mssql',
  host: required('DB_HOST'),
  port: parseInt(process.env.DB_PORT ?? '1433', 10),
  username: required('DB_USERNAME'),
  password: required('DB_PASSWORD'),
  database: required('DB_DATABASE'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true',
  },
  synchronize: false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
};

// CHỈ một export DataSource duy nhất — TypeORM CLI (CommandUtils.loadDataSource)
// từ chối chạy nếu file có nhiều hơn một export trỏ tới instance DataSource
// (kể cả khi named export và default export cùng trỏ về một instance).
export const AppDataSource = new DataSource(dataSourceOptions);
