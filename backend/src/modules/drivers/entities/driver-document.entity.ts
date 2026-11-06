import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { DriverProfile } from './driver-profile.entity';

// DATABASE.md mục 4.7 — CK_DD_Type: các loại ảnh giấy tờ lịch sử đã lưu
export type DriverDocumentType =
  'ID_CARD_FRONT' | 'ID_CARD_BACK' | 'DRIVER_LICENSE' | 'VEHICLE_REGISTRATION';

export type DocumentVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity({ name: 'DriverDocument' })
// Mỗi loại giấy tờ chỉ có một bản hiện hành cho mỗi tài xế
@Unique('UQ_DD_Driver_Type', ['driverId', 'docType'])
@Check(
  'CK_DD_Type',
  `"docType" IN ('ID_CARD_FRONT','ID_CARD_BACK','DRIVER_LICENSE','VEHICLE_REGISTRATION')`,
)
@Check(
  'CK_DD_Status',
  `"verificationStatus" IN ('PENDING','APPROVED','REJECTED')`,
)
export class DriverDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'driverId', type: 'uniqueidentifier' })
  driverId: string;

  @ManyToOne(() => DriverProfile, (driver) => driver.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'driverId', foreignKeyConstraintName: 'FK_DD_Driver' })
  driver: DriverProfile;

  @Column({ name: 'docType', type: 'varchar', length: 30 })
  docType: DriverDocumentType;

  // URL Cloudinary
  @Column({ name: 'fileUrl', type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({
    name: 'verificationStatus',
    type: 'varchar',
    length: 20,
    default: 'PENDING',
  })
  verificationStatus: DocumentVerificationStatus;

  @Column({
    name: 'rejectReason',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  rejectReason: string | null;

  @Column({
    name: 'uploadedAt',
    type: 'datetime2',
    precision: 3,
    default: () => 'SYSUTCDATETIME()',
  })
  uploadedAt: Date;

  @Column({
    name: 'verifiedAt',
    type: 'datetime2',
    precision: 3,
    nullable: true,
  })
  verifiedAt: Date | null;
}
