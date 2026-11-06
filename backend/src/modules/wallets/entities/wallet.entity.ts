import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';

// DATABASE.md mục 4.13 — BR-54: mỗi tài khoản có đúng một ví.
@Entity({ name: 'Wallet' })
// Lưu ý (như DriverProfile.userId): TypeORM còn tự sinh thêm một filtered
// unique index nội bộ (tên "REL_...") cho cột JoinColumn của @OneToOne bên
// dưới — hành vi mặc định của driver mssql, độc lập với UQ_W_User khai báo
// tường minh ở đây để khớp tên với DDL gốc.
@Unique('UQ_W_User', ['userId'])
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userId', type: 'uniqueidentifier' })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_W_User' })
  user: User;

  // Có thể ÂM (BR-55) — phản ánh phí nền tảng tài xế đang nợ do thu tiền mặt.
  @Column({
    name: 'balance',
    type: 'decimal',
    precision: 18,
    scale: 0,
    default: 0,
  })
  balance: string;

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
