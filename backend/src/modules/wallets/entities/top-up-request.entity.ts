import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DriverProfile } from '../../drivers/entities/driver-profile.entity';
import { User } from '../../users/entities/user.entity';

// DATABASE.md mục 4.15 — CK_TU_Status
export type TopUpStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity({ name: 'TopUpRequest' })
@Check('CK_TU_Status', `"status" IN ('PENDING','APPROVED','REJECTED')`)
@Check('CK_TU_Amount', `"amount" BETWEEN 20000 AND 5000000`) // BR-69
// BR-70: mỗi tài xế chỉ có tối đa MỘT yêu cầu đang chờ duyệt
@Index('UX_TopUp_PendingPerDriver', ['driverId'], {
  unique: true,
  where: `"status" = 'PENDING'`,
})
export class TopUpRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'driverId', type: 'uniqueidentifier' })
  driverId: string;

  @ManyToOne(() => DriverProfile)
  @JoinColumn({ name: 'driverId', foreignKeyConstraintName: 'FK_TU_Driver' })
  driver: DriverProfile;

  @Column({ name: 'amount', type: 'decimal', precision: 18, scale: 0 })
  amount: string;

  // Ảnh biên lai chuyển khoản
  @Column({ name: 'receiptUrl', type: 'varchar', length: 500, nullable: true })
  receiptUrl: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'PENDING' })
  status: TopUpStatus;

  @Column({
    name: 'rejectReason',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  rejectReason: string | null;

  @Column({ name: 'reviewedBy', type: 'uniqueidentifier', nullable: true })
  reviewedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedBy', foreignKeyConstraintName: 'FK_TU_Reviewer' })
  reviewer: User | null;

  @Column({ name: 'reviewedAt', type: 'datetime2', precision: 3, nullable: true })
  reviewedAt: Date | null;

  @Column({
    name: 'createdAt',
    type: 'datetime2',
    precision: 3,
    default: () => 'SYSUTCDATETIME()',
  })
  createdAt: Date;
}
