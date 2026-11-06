import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// DATABASE.md mục 4.5 — FK_RT_User, IX_RT_User, IX_RT_Token
@Entity({ name: 'RefreshToken' })
@Index('IX_RT_User', ['userId', 'revokedAt'])
@Index('IX_RT_Token', ['tokenHash'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userId', type: 'uniqueidentifier' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_RT_User' })
  user: User;

  // BR-12: token phải được băm trước khi lưu, không bao giờ lưu bản gốc.
  @Column({ name: 'tokenHash', type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ name: 'deviceId', type: 'varchar', length: 255, nullable: true })
  deviceId: string | null;

  @Column({ name: 'deviceName', type: 'nvarchar', length: 200, nullable: true })
  deviceName: string | null;

  // Token thiết bị để gửi thông báo đẩy (FCM).
  @Column({ name: 'fcmToken', type: 'varchar', length: 500, nullable: true })
  fcmToken: string | null;

  @Column({ name: 'expiresAt', type: 'datetime2', precision: 3 })
  expiresAt: Date;

  @Column({ name: 'revokedAt', type: 'datetime2', precision: 3, nullable: true })
  revokedAt: Date | null;

  @Column({
    name: 'createdAt',
    type: 'datetime2',
    precision: 3,
    default: () => 'SYSUTCDATETIME()',
  })
  createdAt: Date;
}
