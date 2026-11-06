import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { DriverProfile } from '../../drivers/entities/driver-profile.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { User } from '../../users/entities/user.entity';

// DATABASE.md mục 4.10 — 7 trạng thái + CHECK (BR-31, mục 6 BUSINESS-RULES)
export type RideStatus =
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_DRIVER_FOUND';

export type RideVehicleType = 'MOTORBIKE' | 'CAR';
export type RidePaymentMethod = 'CASH' | 'WALLET';

// BR-50: người thực hiện hủy chuyến
export type RideCancelledBy = 'ADMIN' | 'DRIVER' | 'SYSTEM';

@Entity({ name: 'Ride' })
@Unique('UQ_R_Code', ['rideCode'])
@Check(
  'CK_R_Status',
  `"status" IN ('SEARCHING','ACCEPTED','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED','NO_DRIVER_FOUND')`,
)
@Check('CK_R_VehicleType', `"vehicleType" IN ('MOTORBIKE','CAR')`)
@Check('CK_R_Payment', `"paymentMethod" IN ('CASH','WALLET')`)
@Check(
  'CK_R_CancelledBy',
  `"cancelledBy" IS NULL OR "cancelledBy" IN ('ADMIN','DRIVER','SYSTEM')`,
)
@Check('CK_R_Fare', `"estimatedFare" > 0`)
@Check('CK_R_Distance', `"distanceKm" > 0`)
// Đã nhận chuyến thì bắt buộc phải có tài xế
@Check(
  'CK_R_DriverRequired',
  `"status" IN ('SEARCHING','CANCELLED','NO_DRIVER_FOUND') OR "driverId" IS NOT NULL`,
)
// Đã hoàn thành thì bắt buộc có đủ số liệu tài chính (BR-60)
@Check(
  'CK_R_Settled',
  `"status" <> 'COMPLETED' OR ("finalFare" IS NOT NULL AND "commissionRate" IS NOT NULL AND "platformFee" IS NOT NULL AND "driverEarning" IS NOT NULL)`,
)
// Hủy thì bắt buộc có lý do và người hủy (BR-50)
@Check(
  'CK_R_CancelInfo',
  `"status" <> 'CANCELLED' OR ("cancelReason" IS NOT NULL AND "cancelledBy" IS NOT NULL)`,
)
export class Ride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // BỔ SUNG: mã dễ đọc, ví dụ R20260918-0001
  @Column({ name: 'rideCode', type: 'varchar', length: 20 })
  rideCode: string;

  @Column({ name: 'customerId', type: 'uniqueidentifier' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customerId', foreignKeyConstraintName: 'FK_R_Customer' })
  customer: Customer;

  @Column({ name: 'driverId', type: 'uniqueidentifier', nullable: true })
  driverId: string | null;

  @ManyToOne(() => DriverProfile, { nullable: true })
  @JoinColumn({ name: 'driverId', foreignKeyConstraintName: 'FK_R_Driver' })
  driver: DriverProfile | null;

  @Column({ name: 'vehicleId', type: 'uniqueidentifier', nullable: true })
  vehicleId: string | null;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicleId', foreignKeyConstraintName: 'FK_R_Vehicle' })
  vehicle: Vehicle | null;

  // ── Điểm đón / điểm trả ──────────────────────────────────
  @Column({ name: 'pickupAddress', type: 'nvarchar', length: 500 })
  pickupAddress: string;

  @Column({ name: 'pickupLatitude', type: 'decimal', precision: 10, scale: 7 })
  pickupLatitude: string;

  @Column({ name: 'pickupLongitude', type: 'decimal', precision: 10, scale: 7 })
  pickupLongitude: string;

  @Column({ name: 'dropoffAddress', type: 'nvarchar', length: 500 })
  dropoffAddress: string;

  @Column({ name: 'dropoffLatitude', type: 'decimal', precision: 10, scale: 7 })
  dropoffLatitude: string;

  @Column({ name: 'dropoffLongitude', type: 'decimal', precision: 10, scale: 7 })
  dropoffLongitude: string;

  // ── Thông số chuyến ───────────────────────────────────────
  // BỔ SUNG: loại xe yêu cầu (BR-25)
  @Column({ name: 'vehicleType', type: 'varchar', length: 20 })
  vehicleType: RideVehicleType;

  @Column({ name: 'distanceKm', type: 'decimal', precision: 8, scale: 2 })
  distanceKm: string;

  @Column({
    name: 'estimatedDurationMinutes',
    type: 'int',
    nullable: true,
  })
  estimatedDurationMinutes: number | null;

  // ── Tiền bạc ──────────────────────────────────────────────
  @Column({ name: 'estimatedFare', type: 'decimal', precision: 18, scale: 0 })
  estimatedFare: string;

  @Column({
    name: 'finalFare',
    type: 'decimal',
    precision: 18,
    scale: 0,
    nullable: true,
  })
  finalFare: string | null;

  // BỔ SUNG: snapshot tỷ lệ phí tại thời điểm hoàn thành (BR-60)
  @Column({
    name: 'commissionRate',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  commissionRate: string | null;

  // BỔ SUNG
  @Column({
    name: 'platformFee',
    type: 'decimal',
    precision: 18,
    scale: 0,
    nullable: true,
  })
  platformFee: string | null;

  // BỔ SUNG
  @Column({
    name: 'driverEarning',
    type: 'decimal',
    precision: 18,
    scale: 0,
    nullable: true,
  })
  driverEarning: string | null;

  @Column({
    name: 'paymentMethod',
    type: 'varchar',
    length: 20,
    default: 'CASH',
  })
  paymentMethod: RidePaymentMethod;

  // ── Trạng thái và điều phối ───────────────────────────────
  @Column({
    name: 'status',
    type: 'varchar',
    length: 30,
    default: 'SEARCHING',
  })
  status: RideStatus;

  // BỔ SUNG
  @Column({ name: 'dispatchRound', type: 'int', default: 0 })
  dispatchRound: number;

  // ── Mốc thời gian (BR-35) ─────────────────────────────────
  @Column({
    name: 'createdAt',
    type: 'datetime2',
    precision: 3,
    default: () => 'SYSUTCDATETIME()',
  })
  createdAt: Date;

  @Column({ name: 'acceptedAt', type: 'datetime2', precision: 3, nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'arrivedAt', type: 'datetime2', precision: 3, nullable: true })
  arrivedAt: Date | null;

  @Column({ name: 'startedAt', type: 'datetime2', precision: 3, nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completedAt', type: 'datetime2', precision: 3, nullable: true })
  completedAt: Date | null;

  @Column({ name: 'cancelledAt', type: 'datetime2', precision: 3, nullable: true })
  cancelledAt: Date | null;

  // BỔ SUNG (BR-50)
  @Column({ name: 'cancelledBy', type: 'varchar', length: 20, nullable: true })
  cancelledBy: RideCancelledBy | null;

  @Column({
    name: 'cancelReason',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  cancelReason: string | null;

  // BỔ SUNG: Admin tạo chuyến
  @Column({ name: 'createdBy', type: 'uniqueidentifier' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy', foreignKeyConstraintName: 'FK_R_Creator' })
  creator: User;

  @Column({
    name: 'updatedAt',
    type: 'datetime2',
    precision: 3,
    default: () => 'SYSUTCDATETIME()',
  })
  updatedAt: Date;
}
