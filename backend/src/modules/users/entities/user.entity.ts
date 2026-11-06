import { Check, Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

// DATABASE.md mục 4.3 — CK_User_Role, CK_User_Status
export type UserRole = 'ADMIN' | 'DRIVER';

// BR-20: 'REJECTED' KHÔNG thuộc User.status — việc từ chối hồ sơ là trách
// nhiệm của DriverProfile.approvalStatus, không chồng lấn lên cột này.
export type UserStatus = 'PENDING' | 'ACTIVE' | 'LOCKED';

// [User] là từ khóa dành riêng của SQL Server — bắt buộc đặt tên tường minh.
@Entity({ name: 'User' })
@Unique('UQ_User_Email', ['email'])
@Check('CK_User_Role', `"role" IN ('ADMIN','DRIVER')`)
@Check('CK_User_Status', `"status" IN ('PENDING','ACTIVE','LOCKED')`)
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'passwordHash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20 })
  role: UserRole;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'PENDING' })
  status: UserStatus;

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
