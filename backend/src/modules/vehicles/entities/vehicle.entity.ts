import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { DriverProfile } from '../../drivers/entities/driver-profile.entity';

// DATABASE.md mục 4.8 — CK_V_Type
export type VehicleType = 'MOTORBIKE' | 'CAR';
export type VehicleVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity({ name: 'Vehicle' })
@Unique('UQ_V_Plate', ['licensePlate']) // BR-22
@Check('CK_V_Type', `"vehicleType" IN ('MOTORBIKE','CAR')`)
@Check('CK_V_Status', `"verificationStatus" IN ('PENDING','APPROVED','REJECTED')`)
// BR-23: mỗi tài xế chỉ có ĐÚNG MỘT xe đang hoạt động — filtered unique index,
// không thể diễn đạt bằng UNIQUE thường.
@Index('UX_Vehicle_ActivePerDriver', ['driverId'], {
  unique: true,
  where: '"isActive" = 1',
})
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'driverId', type: 'uniqueidentifier' })
  driverId: string;

  @ManyToOne(() => DriverProfile, (driver) => driver.vehicles)
  @JoinColumn({ name: 'driverId', foreignKeyConstraintName: 'FK_V_Driver' })
  driver: DriverProfile;

  @Column({ name: 'vehicleType', type: 'varchar', length: 20 })
  vehicleType: VehicleType;

  @Column({ name: 'brand', type: 'nvarchar', length: 100 })
  brand: string;

  @Column({ name: 'modelName', type: 'nvarchar', length: 100 })
  modelName: string;

  @Column({ name: 'licensePlate', type: 'varchar', length: 20 })
  licensePlate: string;

  @Column({ name: 'color', type: 'nvarchar', length: 50, nullable: true })
  color: string | null;

  @Column({ name: 'isActive', type: 'bit', default: true })
  isActive: boolean;

  @Column({
    name: 'verificationStatus',
    type: 'varchar',
    length: 20,
    default: 'PENDING',
  })
  verificationStatus: VehicleVerificationStatus;

  @Column({
    name: 'createdAt',
    type: 'datetime2',
    precision: 3,
    default: () => 'SYSUTCDATETIME()',
  })
  createdAt: Date;

  @Column({
    name: 'updatedAt',
    type: 'datetime2',
    precision: 3,
    default: () => 'SYSUTCDATETIME()',
  })
  updatedAt: Date;
}
