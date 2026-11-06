import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

// DATABASE.md mục 4.9 — Customer (khách hàng mô phỏng do Admin tạo)
@Entity({ name: 'Customer' })
@Unique('UQ_C_Phone', ['phoneNumber'])
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'fullName', type: 'nvarchar', length: 150 })
  fullName: string;

  @Column({ name: 'phoneNumber', type: 'varchar', length: 15 })
  phoneNumber: string;

  @Column({ name: 'avatarUrl', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'note', type: 'nvarchar', length: 500, nullable: true })
  note: string | null;

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
