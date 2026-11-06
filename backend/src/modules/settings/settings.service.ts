import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './entities/system-config.entity';

const REFRESH_INTERVAL_MS = 60_000; // BR-02: làm mới mỗi 60 giây

// BR-01/BR-02: SettingsService là nguồn duy nhất để đọc tham số nghiệp vụ.
// Nạp toàn bộ SystemConfig vào bộ nhớ khi khởi động, tự làm mới định kỳ —
// KHÔNG truy vấn CSDL cho từng lần đọc cấu hình.
@Injectable()
export class SettingsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettingsService.name);
  private cache = new Map<string, string>();
  // Tự quản lý bằng setInterval (thay vì @Interval() của @nestjs/schedule) để
  // có handle timer trong tay và clearInterval() được ở onModuleDestroy —
  // nếu không, mỗi lần Jest tạo TestingModule (một e2e spec = một app mới)
  // sẽ để lại một interval sống mãi, khiến "A worker process has failed to
  // exit gracefully" sau khi test xong.
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refresh();

    this.refreshTimer = setInterval(() => {
      this.refresh().catch((error) => {
        this.logger.error('Làm mới SystemConfig cache thất bại', error);
      });
    }, REFRESH_INTERVAL_MS);
    // .unref(): timer này không phải lý do giữ tiến trình Node sống — không
    // được chặn tiến trình thoát (ví dụ khi chạy script CLI hoặc kết thúc
    // test) chỉ vì còn một interval làm mới cache đang chờ.
    this.refreshTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async refresh(): Promise<void> {
    const rows = await this.configRepo.find();
    const next = new Map<string, string>();
    for (const row of rows) {
      next.set(row.key, row.value);
    }
    this.cache = next;
    this.logger.debug(
      `Đã làm mới SystemConfig cache (${this.cache.size} tham số).`,
    );
  }

  // BR-01: mọi con số mang tính chính sách phải đọc qua đây, không hardcode.
  getNumber(key: string): number {
    const raw = this.getRaw(key);
    const value = Number(raw);
    if (Number.isNaN(value)) {
      throw new Error(
        `SystemConfig["${key}"] = "${raw}" không phải là số hợp lệ.`,
      );
    }
    return value;
  }

  getString(key: string): string {
    return this.getRaw(key);
  }

  // API.md mục 9 (#58) — GET /admin/settings.
  async findAll(): Promise<SystemConfig[]> {
    return this.configRepo.find({ order: { key: 'ASC' } });
  }

  // API.md mục 9 (#59) — PATCH /admin/settings/:key. BR-02: sau khi ghi CSDL
  // phải làm mới cache NGAY (không chờ chu kỳ 60 giây), để lần đọc kế tiếp
  // (kể cả trong cùng request tiếp theo) thấy giá trị mới ngay lập tức.
  async updateValue(
    key: string,
    value: string,
  ): Promise<{ key: string; value: string; previousValue: string }> {
    const existing = await this.configRepo.findOne({ where: { key } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy tham số cấu hình "${key}"`);
    }

    if (existing.dataType === 'NUMBER' && Number.isNaN(Number(value))) {
      throw new BadRequestException(
        `Giá trị "${value}" không phải là số hợp lệ cho tham số "${key}"`,
      );
    }
    if (
      existing.dataType === 'BOOLEAN' &&
      value !== 'true' &&
      value !== 'false'
    ) {
      throw new BadRequestException(
        `Giá trị "${value}" phải là "true" hoặc "false" cho tham số "${key}"`,
      );
    }

    const previousValue = existing.value;
    await this.configRepo.update(key, {
      value,
      updatedAt: () => 'SYSUTCDATETIME()',
    });
    await this.refresh();

    return { key, value, previousValue };
  }

  private getRaw(key: string): string {
    const value = this.cache.get(key);
    if (value === undefined) {
      throw new Error(
        `Không tìm thấy tham số cấu hình "${key}" trong SystemConfig.`,
      );
    }
    return value;
  }
}
