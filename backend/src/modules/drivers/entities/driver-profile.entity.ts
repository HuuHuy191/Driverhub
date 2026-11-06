import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DriverDocument } from './driver-document.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

// DATABASE.md mục 4.6 — CK_DP_Approval (BR-17, BR-20)
export type DriverApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity({ name: 'DriverProfile' })
// Quan hệ 1-1 với User. Lưu ý: với driver mssql, TypeORM còn tự sinh thêm
// một filtered unique index nội bộ (tên "REL_...") cho cột JoinColumn của
// @OneToOne bên dưới — đây là hành vi mặc định không tắt được, độc lập với
// ràng buộc UQ_DP_User khai báo tường minh ở đây để khớp tên với DDL gốc.
@Unique('UQ_DP_User', ['userId'])
@Unique('UQ_DP_Phone', ['phoneNumber']) // BR-05
@Check(
  'CK_DP_Approval',
  `"approvalStatus" IN ('PENDING','APPROVED','REJECTED')`,
)
// BR-18: từ chối thì bắt buộc có lý do
@Check(
  'CK_DP_RejectReason',
  `"approvalStatus" <> 'REJECTED' OR "rejectReason" IS NOT NULL`,
)
@Check(
  'CK_DP_Lat',
  `"currentLatitude" IS NULL OR "currentLatitude" BETWEEN -90 AND 90`,
)
@Check(
  'CK_DP_Lng',
  `"currentLongitude" IS NULL OR "currentLongitude" BETWEEN -180 AND 180`,
)
export class DriverProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userId', type: 'uniqueidentifier' })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_DP_User' })
  user: User;

  @Column({ name: 'fullName', type: 'nvarchar', length: 150 })
  fullName: string;

  @Column({ name: 'phoneNumber', type: 'varchar', length: 15 })
  phoneNumber: string;

  @Column({ name: 'dateOfBirth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  // BR-16: Admin kiểm tra thủ công thông tin CCCD và giấy phép lái xe.
  @Column({
    name: 'citizenIdNumber',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  citizenIdNumber: string | null;

  @Column({ name: 'citizenIdIssueDate', type: 'date', nullable: true })
  citizenIdIssueDate: string | null;

  @Column({
    name: 'driverLicenseNumber',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  driverLicenseNumber: string | null;

  @Column({ name: 'driverLicenseIssueDate', type: 'date', nullable: true })
  driverLicenseIssueDate: string | null;

  @Column({ name: 'avatarUrl', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({
    name: 'temporaryAddress',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  temporaryAddress: string | null;

  // Trạng thái duyệt hồ sơ (BR-17, BR-20)
  @Column({
    name: 'approvalStatus',
    type: 'varchar',
    length: 20,
    default: 'PENDING',
  })
  approvalStatus: DriverApprovalStatus;

  // BỔ SUNG: bắt buộc khi REJECTED (BR-18)
  @Column({
    name: 'rejectReason',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  rejectReason: string | null;

  @Column({
    name: 'approvedAt',
    type: 'datetime2',
    precision: 3,
    nullable: true,
  })
  approvedAt: Date | null;

  // BỔ SUNG: Admin nào đã duyệt
  @Column({ name: 'approvedBy', type: 'uniqueidentifier', nullable: true })
  approvedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({
    name: 'approvedBy',
    foreignKeyConstraintName: 'FK_DP_Approver',
  })
  approver: User | null;

  // Trạng thái hoạt động
  @Column({ name: 'isOnline', type: 'bit', default: false })
  isOnline: boolean;

  // BỔ SUNG: vị trí gần nhất, phục vụ điều phối (BR-27, BR-28).
  // decimal trả về dạng string từ driver mssql để tránh mất độ chính xác.
  @Column({
    name: 'currentLatitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  currentLatitude: string | null;

  @Column({
    name: 'currentLongitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  currentLongitude: string | null;

  @Column({
    name: 'lastLocationUpdatedAt',
    type: 'datetime2',
    precision: 3,
    nullable: true,
  })
  lastLocationUpdatedAt: Date | null;

  // BỔ SUNG: thống kê
  @Column({ name: 'totalRides', type: 'int', default: 0 })
  totalRides: number;

  @Column({ name: 'cancelCount', type: 'int', default: 0 })
  cancelCount: number;

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

  @OneToMany(() => DriverDocument, (document) => document.driver)
  documents: DriverDocument[];

  @OneToMany(() => Vehicle, (vehicle) => vehicle.driver)
  vehicles: Vehicle[];
}
