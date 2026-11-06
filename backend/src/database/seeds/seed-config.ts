import { AppDataSource } from '../data-source';
import {
  SystemConfig,
  SystemConfigDataType,
} from '../../modules/settings/entities/system-config.entity';

interface ConfigSeed {
  key: string;
  value: string;
  dataType: SystemConfigDataType;
  description: string;
}

// DATABASE.md mục 7.1 — 12 tham số nghiệp vụ (BR-01)
const CONFIG_SEEDS: ConfigSeed[] = [
  {
    key: 'COMMISSION_RATE',
    value: '0.10',
    dataType: 'NUMBER',
    description: 'Tỷ lệ phí nền tảng',
  },
  {
    key: 'OFFER_TIMEOUT_SECONDS',
    value: '20',
    dataType: 'NUMBER',
    description: 'Thời gian chờ tài xế phản hồi',
  },
  {
    key: 'DISPATCH_BATCH_SIZE',
    value: '5',
    dataType: 'NUMBER',
    description: 'Số tài xế mỗi vòng điều phối',
  },
  {
    key: 'DISPATCH_MAX_ROUNDS',
    value: '3',
    dataType: 'NUMBER',
    description: 'Số vòng điều phối tối đa',
  },
  {
    key: 'DISPATCH_RADIUS_KM',
    value: '10',
    dataType: 'NUMBER',
    description: 'Bán kính tìm tài xế (km)',
  },
  {
    key: 'MAX_NEGATIVE_BALANCE',
    value: '-200000',
    dataType: 'NUMBER',
    description: 'Ngưỡng ví âm tối đa (VNĐ)',
  },
  {
    key: 'LOCATION_STALE_MINUTES',
    value: '5',
    dataType: 'NUMBER',
    description: 'Ngưỡng vị trí bị coi là cũ',
  },
  {
    key: 'FARE_BASE_MOTORBIKE',
    value: '12000',
    dataType: 'NUMBER',
    description: 'Giá mở cửa xe máy',
  },
  {
    key: 'FARE_PER_KM_MOTORBIKE',
    value: '4000',
    dataType: 'NUMBER',
    description: 'Đơn giá mỗi km - xe máy',
  },
  {
    key: 'FARE_BASE_CAR',
    value: '25000',
    dataType: 'NUMBER',
    description: 'Giá mở cửa ô tô',
  },
  {
    key: 'FARE_PER_KM_CAR',
    value: '9000',
    dataType: 'NUMBER',
    description: 'Đơn giá mỗi km - ô tô',
  },
  {
    key: 'FARE_BASE_DISTANCE_KM',
    value: '2',
    dataType: 'NUMBER',
    description: 'Số km đã bao gồm trong giá mở cửa',
  },
];

async function main() {
  await AppDataSource.initialize();

  try {
    const repo = AppDataSource.getRepository(SystemConfig);

    // upsert theo khóa chính "key" (MERGE trên mssql) — idempotent: chạy lại
    // nhiều lần không lỗi trùng khóa, giá trị cũ được ghi đè bằng giá trị mới.
    await repo.upsert(CONFIG_SEEDS, ['key']);

    console.log(
      `Đã nạp ${CONFIG_SEEDS.length} tham số vào SystemConfig (upsert theo "key").`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('Seed SystemConfig thất bại:', err);
  process.exit(1);
});
