import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Wallet } from './wallet.entity';
import { Ride } from '../../rides/entities/ride.entity';

// DATABASE.md mục 4.14 — CK_WT_Type
export type WalletTransactionType =
  | 'COMMISSION_FEE'
  | 'COMMISSION_INCOME'
  | 'RIDE_EARNING'
  | 'TOPUP'
  | 'WITHDRAW'
  | 'ADJUSTMENT';

export type WalletTransactionDirection = 'CREDIT' | 'DEBIT';

@Entity({ name: 'WalletTransaction' })
@Check(
  'CK_WT_Type',
  `"type" IN ('COMMISSION_FEE','COMMISSION_INCOME','RIDE_EARNING','TOPUP','WITHDRAW','ADJUSTMENT')`,
)
@Check('CK_WT_Direction', `"direction" IN ('CREDIT','DEBIT')`)
@Check('CK_WT_Amount', `"amount" > 0`)
// BR-64 LỚP 2: lưới an toàn chống trừ phí hai lần cho cùng một chuyến.
// DDL gốc ban đầu khai báo UQ_WT_Ride_Type dạng UNIQUE constraint thường,
// nhưng SQL Server coi mọi NULL là "bằng nhau" trong UNIQUE nên sẽ chặn
// nhầm các giao dịch nạp/rút (rideId = NULL). Mục 4.14 đã thay bằng filtered
// unique index UX_WT_Ride_Type (WHERE rideId IS NOT NULL) — dùng đúng bản
// đã sửa này, không dùng UQ_WT_Ride_Type.
@Index('UX_WT_Ride_Type', ['rideId', 'type'], {
  unique: true,
  where: '"rideId" IS NOT NULL',
})
@Index('IX_WT_Wallet', ['walletId', 'createdAt'])
@Index('IX_WT_Ride', ['rideId'])
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'walletId', type: 'uniqueidentifier' })
  walletId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'walletId', foreignKeyConstraintName: 'FK_WT_Wallet' })
  wallet: Wallet;

  @Column({ name: 'rideId', type: 'uniqueidentifier', nullable: true })
  rideId: string | null;

  @ManyToOne(() => Ride, { nullable: true })
  @JoinColumn({ name: 'rideId', foreignKeyConstraintName: 'FK_WT_Ride' })
  ride: Ride | null;

  @Column({ name: 'type', type: 'varchar', length: 30 })
  type: WalletTransactionType;

  @Column({ name: 'direction', type: 'varchar', length: 10 })
  direction: WalletTransactionDirection;

  // Luôn DƯƠNG; direction quyết định chiều cộng/trừ.
  @Column({ name: 'amount', type: 'decimal', precision: 18, scale: 0 })
  amount: string;

  // BỔ SUNG (BR-57): ảnh chụp số dư ví ngay SAU khi giao dịch được áp dụng.
  @Column({ name: 'balanceAfter', type: 'decimal', precision: 18, scale: 0 })
  balanceAfter: string;

  @Column({ name: 'description', type: 'nvarchar', length: 500 })
  description: string;

  @Column({
    name: 'createdAt',
    type: 'datetime2',
    precision: 3,
    default: () => 'SYSUTCDATETIME()',
  })
  createdAt: Date;
}
