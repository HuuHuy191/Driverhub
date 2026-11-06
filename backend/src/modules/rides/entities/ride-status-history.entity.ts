import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Ride } from './ride.entity';

// DATABASE.md mục 4.12 — CK_RSH_By
export type RideChangedByType = 'ADMIN' | 'DRIVER' | 'SYSTEM';

// Bảng append-only, lượng bản ghi lớn -> dùng bigint IDENTITY thay vì
// uniqueidentifier để có hiệu năng ghi tốt hơn (xem ghi chú DDL gốc mục 4.12).
@Entity({ name: 'RideStatusHistory' })
@Check('CK_RSH_By', `"changedByType" IN ('ADMIN','DRIVER','SYSTEM')`)
@Index('IX_RSH_Ride', ['rideId', 'changedAt'])
export class RideStatusHistory {
  // bigint vượt quá phạm vi an toàn của JS number nên trả về dạng string.
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'rideId', type: 'uniqueidentifier' })
  rideId: string;

  @ManyToOne(() => Ride, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rideId', foreignKeyConstraintName: 'FK_RSH_Ride' })
  ride: Ride;

  // NULL khi khởi tạo chuyến
  @Column({ name: 'fromStatus', type: 'varchar', length: 30, nullable: true })
  fromStatus: string | null;

  @Column({ name: 'toStatus', type: 'varchar', length: 30 })
  toStatus: string;

  @Column({ name: 'changedByType', type: 'varchar', length: 20 })
  changedByType: RideChangedByType;

  // Không có FK: khi changedByType = 'SYSTEM' thì không có User thật tương ứng.
  @Column({ name: 'changedById', type: 'uniqueidentifier', nullable: true })
  changedById: string | null;

  @Column({ name: 'note', type: 'nvarchar', length: 500, nullable: true })
  note: string | null;

  @Column({
    name: 'changedAt',
    type: 'datetime2',
    precision: 3,
    default: () => 'SYSUTCDATETIME()',
  })
  changedAt: Date;
}
