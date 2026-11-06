import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverProfile } from '../../modules/drivers/entities/driver-profile.entity';
import { UserStatus } from '../../modules/users/entities/user.entity';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { BusinessException } from '../exceptions/business.exception';
import { ERROR_CODES } from '../constants/error-codes';

// API.md ký hiệu 🚗 — chỉ tài xế ĐÃ ĐƯỢC DUYỆT.
// BR-20: DriverProfile.approvalStatus và User.status có trách nhiệm RIÊNG
// BIỆT (duyệt hồ sơ đối tác vs. khóa tài khoản đăng nhập) — KHÔNG được suy
// diễn cột này từ cột kia, phải kiểm tra độc lập cả hai.
@Injectable()
export class ApprovedDriverGuard implements CanActivate {
  constructor(
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    // BR-20: nguồn sự thật duy nhất cho "đã duyệt hồ sơ" là
    // DriverProfile.approvalStatus — không suy diễn từ User.status.
    const driverProfile = user
      ? await this.driverProfileRepo.findOne({ where: { userId: user.userId } })
      : null;
    if (!driverProfile || driverProfile.approvalStatus !== 'APPROVED') {
      throw new BusinessException(
        'ACCOUNT_NOT_APPROVED',
        ERROR_CODES.ACCOUNT_NOT_APPROVED.httpStatus,
        ERROR_CODES.ACCOUNT_NOT_APPROVED.message,
      ); // BR-07
    }

    // BR-20: nguồn sự thật duy nhất cho "tài khoản có bị khóa" là
    // User.status — không suy diễn từ approvalStatus vừa kiểm tra ở trên.
    const status = user?.status as UserStatus | undefined;
    if (status === 'LOCKED') {
      throw new BusinessException(
        'ACCOUNT_LOCKED',
        ERROR_CODES.ACCOUNT_LOCKED.httpStatus,
        ERROR_CODES.ACCOUNT_LOCKED.message,
      ); // BR-21
    }
    if (status !== 'ACTIVE') {
      // Trạng thái không nhất quán (vd. hồ sơ APPROVED nhưng tài khoản vẫn
      // PENDING) — coi như chưa đủ điều kiện, không suy đoán thêm.
      throw new BusinessException(
        'ACCOUNT_NOT_APPROVED',
        ERROR_CODES.ACCOUNT_NOT_APPROVED.httpStatus,
        ERROR_CODES.ACCOUNT_NOT_APPROVED.message,
      );
    }

    return true;
  }
}
