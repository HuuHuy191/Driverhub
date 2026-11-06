import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Ride } from './ride.entity';
import { DriverProfile } from '../../drivers/entities/driver-profile.entity';

// DATABASE.md mục 4.11 — CK_RO_Status (mục 8.3 BUSINESS-RULES)
export type RideOfferStatus =
  | 'SENT'
  | 'VIEWED'
  | 'ACCEPTED'
  | 'IGNORED'
  | 'EXPIRED'
  | 'LOST';

@Entity({ name: 'RideOffer' })
// BR-44: một chuyến không bao giờ gửi lặp cho cùng một tài xế
@Unique('UQ_RideOffer_Ride_Driver', ['rideId', 'driverId'])
@Check(
  'CK_RO_Status',
  `"status" IN ('SENT','VIEWED','ACCEPTED','IGNORED','EXPIRED','LOST')`,
)
export class RideOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rideId', type: 'uniqueidentifier' })
  rideId: string;

  @ManyToOne(() => Ride, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rideId', foreignKeyConstraintName: 'FK_RO_Ride' })
  ride: Ride;

  @Column({ name: 'driverId', type: 'uniqueidentifier' })
  driverId: string;

  @ManyToOne(() => DriverProfile)
  @JoinColumn({ name: 'driverId', foreignKeyConstraintName: 'FK_RO_Driver' })
  driver: DriverProfile;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'SENT' })
  status: RideOfferStatus;

  // BỔ SUNG
  @Column({ name: 'round', type: 'int', default: 1 })
  round: number;

  // BỔ SUNG: khoảng cách lúc gửi, để phân tích
  @Column({
    name: 'distanceKm',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  distanceKm: string | null;

  @Column({
    name: 'offeredAt',
    type: 'datetime2',
    precision: 3,
    default: () => 'SYSUTCDATETIME()',
  })
  offeredAt: Date;

  @Column({ name: 'viewedAt', type: 'datetime2', precision: 3, nullable: true })
  viewedAt: Date | null;

  @Column({
    name: 'respondedAt',
    type: 'datetime2',
    precision: 3,
    nullable: true,
  })
  respondedAt: Date | null;

  @Column({ name: 'expiredAt', type: 'datetime2', precision: 3 })
  expiredAt: Date;
}
