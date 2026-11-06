import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

// DATABASE.md mục 4.16 — bảng thông báo trong ứng dụng.
@Entity({ name: 'Notification' })
@Index('IX_N_User', ['userId', 'isRead', 'createdAt'])
export class Notification {
  // bigint vượt quá phạm vi an toàn của JS number nên trả về dạng string.
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'userId', type: 'uniqueidentifier' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_N_User' })
  user: User;

  @Column({ name: 'type', type: 'varchar', length: 40 })
  type: string;

  @Column({ name: 'title', type: 'nvarchar', length: 200 })
  title: string;

  @Column({ name: 'body', type: 'nvarchar', length: 500 })
  body: string;

  // Payload kèm theo, ví dụ { "rideId": "..." }
  @Column({ name: 'dataJson', type: 'nvarchar', length: 'MAX', nullable: true })
  dataJson: string | null;

  @Column({ name: 'isRead', type: 'bit', default: false })
  isRead: boolean;

  @Column({
    name: 'createdAt',
    type: 'datetime2',
    precision: 3,
    default: () => 'SYSUTCDATETIME()',
  })
  createdAt: Date;
}
