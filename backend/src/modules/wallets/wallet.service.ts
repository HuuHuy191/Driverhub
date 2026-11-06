import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import {
  WalletTransaction,
  WalletTransactionDirection,
  WalletTransactionType,
} from './entities/wallet-transaction.entity';
import { Ride } from '../rides/entities/ride.entity';
import { SettingsService } from '../settings/settings.service';
import { ListWalletTransactionsDto } from './dto/list-wallet-transactions.dto';
import { PaginationMeta } from '../drivers/drivers.service';

const TYPE_LABELS: Record<WalletTransactionType, string> = {
  COMMISSION_FEE: 'Phí nền tảng',
  COMMISSION_INCOME: 'Thu phí nền tảng',
  RIDE_EARNING: 'Thu nhập chuyến đi',
  TOPUP: 'Nạp tiền',
  WITHDRAW: 'Rút tiền',
  ADJUSTMENT: 'Điều chỉnh thủ công',
};

export interface ApplyTransactionParams {
  walletId: string;
  type: WalletTransactionType;
  direction: WalletTransactionDirection;
  amount: number;
  rideId?: string | null;
  description: string;
}

export interface WalletView {
  balance: number;
  maxNegativeBalance: number;
  availableMargin: number;
  isBlocked: boolean;
  warningMessage: string | null;
  updatedAt: Date;
}

export interface WalletTransactionView {
  id: string;
  type: WalletTransactionType;
  typeLabel: string;
  direction: WalletTransactionDirection;
  amount: number;
  balanceAfter: number;
  description: string;
  ride: { id: string; rideCode: string; finalFare: number | null } | null;
  createdAt: Date;
}

export interface PlatformWalletOverview {
  balance: number;
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    allTime: number;
  };
  ridesCompleted: { today: number; thisMonth: number };
}

// BR-56: MỌI thay đổi số dư ví trong toàn hệ thống PHẢI đi qua
// WalletService.applyTransaction() — không nơi nào khác được UPDATE
// Wallet.balance trực tiếp.
@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepo: Repository<WalletTransaction>,
    @InjectRepository(Ride) private readonly rideRepo: Repository<Ride>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
  ) {}

  // BR-56 + BR-58: cập nhật số dư và chèn WalletTransaction LUÔN đi cùng
  // nhau. `manager` do nơi gọi truyền vào (thường là queryRunner.manager của
  // một transaction lớn hơn, ví dụ quyết toán chuyến BR-63 hoặc duyệt nạp
  // tiền BR-68) để cả hai thao tác này nằm trong đúng transaction đó — hàm
  // này không tự mở/đóng transaction riêng.
  async applyTransaction(
    manager: EntityManager,
    params: ApplyTransactionParams,
  ): Promise<WalletTransaction> {
    if (!(params.amount > 0)) {
      // Bất biến nội bộ, không phải lỗi nghiệp vụ của người dùng cuối — nơi
      // gọi luôn phải truyền amount dương, direction quyết định chiều.
      throw new Error('WalletService.applyTransaction: amount phải dương.');
    }

    const delta =
      params.direction === 'CREDIT' ? params.amount : -params.amount;

    // BR-58: cộng dồn nguyên tử ngay trong UPDATE, OUTPUT lấy balanceAfter
    // tại đúng thời điểm ghi — không đọc balance ra bộ nhớ rồi cộng/trừ tay.
    const updateResult = await manager
      .createQueryBuilder()
      .update(Wallet)
      .set({
        balance: () => 'balance + :delta',
        updatedAt: () => 'SYSUTCDATETIME()',
      })
      .setParameter('delta', delta)
      .where('id = :walletId', { walletId: params.walletId })
      .output('INSERTED.balance AS balance')
      .execute();

    if (updateResult.affected !== 1) {
      throw new NotFoundException('Không tìm thấy ví để cập nhật số dư.');
    }
    // BR-57: balanceAfter là ảnh chụp NGAY sau khi giao dịch được áp dụng.
    const balanceAfter = String(updateResult.raw[0].balance);

    return manager.getRepository(WalletTransaction).save({
      walletId: params.walletId,
      rideId: params.rideId ?? null,
      type: params.type,
      direction: params.direction,
      amount: params.amount.toString(),
      balanceAfter,
      description: params.description,
    });
  }

  // BR-54: "ví nền tảng gắn với tài khoản Admin gốc, tạo khi seed dữ liệu"
  // (DATABASE.md mục 7.2) — không có cờ isPlatform riêng trong schema, nguồn
  // sự thật duy nhất là ví của tài khoản ADMIN cũ nhất. `manager` tùy chọn để
  // gọi được từ trong một transaction đang mở (ví dụ BR-63) hoặc độc lập.
  async findPlatformWallet(manager?: EntityManager): Promise<Wallet | null> {
    const repo = manager ? manager.getRepository(Wallet) : this.walletRepo;
    return repo
      .createQueryBuilder('wallet')
      .innerJoin('wallet.user', 'user')
      .where('user.role = :role', { role: 'ADMIN' })
      .orderBy('wallet.createdAt', 'ASC')
      .getOne();
  }

  // API.md mục 8.1 — GET /wallet.
  async getWalletView(userId: string): Promise<WalletView> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Không tìm thấy ví');
    }

    const maxNegativeBalance = this.settingsService.getNumber(
      'MAX_NEGATIVE_BALANCE',
    );
    const balance = Number(wallet.balance);
    // BR-67: ví âm vượt ngưỡng thì bị chặn (không bật được ONLINE / bị loại
    // khỏi điều phối) — đúng nghĩa "isBlocked" hiển thị cho tài xế biết trước.
    const isBlocked = balance < maxNegativeBalance;

    return {
      balance,
      maxNegativeBalance,
      availableMargin: balance - maxNegativeBalance,
      isBlocked,
      warningMessage: isBlocked
        ? 'Ví của bạn đang âm vượt mức cho phép, vui lòng nạp tiền để tiếp tục nhận chuyến.'
        : null,
      updatedAt: wallet.updatedAt,
    };
  }

  // API.md mục 8.2 — GET /wallet/transactions.
  async listTransactions(
    userId: string,
    query: ListWalletTransactionsDto,
  ): Promise<{ data: WalletTransactionView[]; meta: PaginationMeta }> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Không tìm thấy ví');
    }

    const { page, limit, order, type, from, to } = query;

    const qb = this.walletTransactionRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.ride', 'ride')
      .where('tx.walletId = :walletId', { walletId: wallet.id });

    if (type) {
      qb.andWhere('tx.type = :type', { type });
    }
    if (from) {
      qb.andWhere('tx.createdAt >= :from', { from: new Date(from) });
    }
    if (to) {
      qb.andWhere('tx.createdAt <= :to', { to: endOfDayUtc(new Date(to)) });
    }

    qb.orderBy('tx.createdAt', order.toUpperCase() as 'ASC' | 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const data: WalletTransactionView[] = rows.map((tx) => ({
      id: tx.id,
      type: tx.type,
      typeLabel: TYPE_LABELS[tx.type],
      direction: tx.direction,
      amount: Number(tx.amount),
      balanceAfter: Number(tx.balanceAfter),
      description: tx.description,
      ride: tx.ride
        ? {
            id: tx.ride.id,
            rideCode: tx.ride.rideCode,
            finalFare:
              tx.ride.finalFare !== null ? Number(tx.ride.finalFare) : null,
          }
        : null,
      createdAt: tx.createdAt,
    }));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // API.md mục 8.3 — GET /admin/wallet/platform.
  async getPlatformOverview(): Promise<PlatformWalletOverview> {
    const platformWallet = await this.findPlatformWallet();
    if (!platformWallet) {
      throw new NotFoundException('Không tìm thấy ví nền tảng');
    }

    const now = new Date();
    const todayStart = startOfDayUtc(now);
    const weekStart = startOfIsoWeekUtc(now);
    const monthStart = startOfMonthUtc(now);

    // DATABASE.md mục 8.2 — doanh thu nền tảng LUÔN lấy platformFee (cột
    // snapshot trong Ride), không tính lại từ commissionRate hiện hành (BR-60).
    const row = await this.rideRepo
      .createQueryBuilder('ride')
      .select(
        'SUM(CASE WHEN ride.completedAt >= :todayStart THEN ride.platformFee ELSE 0 END)',
        'today',
      )
      .addSelect(
        'SUM(CASE WHEN ride.completedAt >= :weekStart THEN ride.platformFee ELSE 0 END)',
        'thisWeek',
      )
      .addSelect(
        'SUM(CASE WHEN ride.completedAt >= :monthStart THEN ride.platformFee ELSE 0 END)',
        'thisMonth',
      )
      .addSelect('SUM(ride.platformFee)', 'allTime')
      .addSelect(
        'SUM(CASE WHEN ride.completedAt >= :todayStart THEN 1 ELSE 0 END)',
        'ridesToday',
      )
      .addSelect(
        'SUM(CASE WHEN ride.completedAt >= :monthStart THEN 1 ELSE 0 END)',
        'ridesThisMonth',
      )
      .where('ride.status = :status', { status: 'COMPLETED' })
      .setParameters({ todayStart, weekStart, monthStart })
      .getRawOne<{
        today: string | null;
        thisWeek: string | null;
        thisMonth: string | null;
        allTime: string | null;
        ridesToday: string | null;
        ridesThisMonth: string | null;
      }>();

    return {
      balance: Number(platformWallet.balance),
      revenue: {
        today: Number(row?.today ?? 0),
        thisWeek: Number(row?.thisWeek ?? 0),
        thisMonth: Number(row?.thisMonth ?? 0),
        allTime: Number(row?.allTime ?? 0),
      },
      ridesCompleted: {
        today: Number(row?.ridesToday ?? 0),
        thisMonth: Number(row?.ridesThisMonth ?? 0),
      },
    };
  }
}

function startOfDayUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

// Tuần ISO bắt đầu từ Thứ Hai.
function startOfIsoWeekUtc(date: Date): Date {
  const start = startOfDayUtc(date);
  const isoDay = start.getUTCDay() === 0 ? 7 : start.getUTCDay(); // 1=Mon..7=Sun
  start.setUTCDate(start.getUTCDate() - (isoDay - 1));
  return start;
}

function endOfDayUtc(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}
