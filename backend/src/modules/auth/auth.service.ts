import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { TokenService, IssuedTokenPair } from './token.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const BCRYPT_COST = 10; // BR-06

// Hash hợp lệ (không gắn với mật khẩu thật nào) dùng để bcrypt.compare khi
// không tìm thấy tài khoản — giữ thời gian phản hồi ổn định giữa "email
// không tồn tại" và "sai mật khẩu", tránh lộ qua độ trễ (BR-11).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'dummy-password-for-timing-safety',
  BCRYPT_COST,
);

export interface UserView {
  id: string;
  email: string;
  role: string;
  status: string;
}

export interface DriverView {
  id: string;
  fullName: string;
  approvalStatus: string;
  isOnline: boolean;
  avatarUrl: string | null;
  rejectReason: string | null;
}

export interface AuthenticatedUserView {
  user: UserView;
  driver?: DriverView;
}

export interface RegisterResultView {
  userId: string;
  driverId: string;
  approvalStatus: string;
  message: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    private readonly tokenService: TokenService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async login(dto: LoginDto): Promise<IssuedTokenPair & AuthenticatedUserView> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    // BR-11: sai email hoặc sai mật khẩu đều trả về CÙNG một lỗi, không tiết
    // lộ email có tồn tại hay không. So sánh luôn với một hash hợp lệ (thật
    // hoặc giả) để bcrypt.compare luôn tốn cùng khoảng thời gian.
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new BusinessException(
        'INVALID_CREDENTIALS',
        ERROR_CODES.INVALID_CREDENTIALS.httpStatus,
        ERROR_CODES.INVALID_CREDENTIALS.message,
      );
    }

    if (user.status === 'LOCKED') {
      throw new BusinessException(
        'ACCOUNT_LOCKED',
        ERROR_CODES.ACCOUNT_LOCKED.httpStatus,
        ERROR_CODES.ACCOUNT_LOCKED.message,
      );
    }

    const tokens = await this.tokenService.issueTokenPair(user.id, user.role, {
      deviceId: dto.deviceId,
      fcmToken: dto.fcmToken,
    });

    return {
      ...tokens,
      user: this.toUserView(user),
      driver:
        user.role === 'DRIVER'
          ? await this.buildDriverView(user.id)
          : undefined,
    };
  }

  // BR-03, API.md mục 2.1.
  async register(dto: RegisterDto): Promise<RegisterResultView> {
    const email = dto.email;

    // BR-04/BR-05/BR-22: kiểm tra định danh trước khi tạo hồ sơ.
    const [existingUser, existingPhone, existingPlate] = await Promise.all([
      this.userRepo.findOne({ where: { email } }),
      this.driverProfileRepo.findOne({
        where: { phoneNumber: dto.phoneNumber },
      }),
      this.dataSource
        .getRepository(Vehicle)
        .findOne({ where: { licensePlate: dto.vehicleLicensePlate } }),
    ]);
    if (existingUser) {
      throw new BusinessException(
        'EMAIL_ALREADY_EXISTS',
        ERROR_CODES.EMAIL_ALREADY_EXISTS.httpStatus,
        ERROR_CODES.EMAIL_ALREADY_EXISTS.message,
      );
    }
    if (existingPhone) {
      throw new BusinessException(
        'PHONE_ALREADY_EXISTS',
        ERROR_CODES.PHONE_ALREADY_EXISTS.httpStatus,
        ERROR_CODES.PHONE_ALREADY_EXISTS.message,
      );
    }
    if (existingPlate) {
      throw new BusinessException(
        'LICENSE_PLATE_EXISTS',
        ERROR_CODES.LICENSE_PLATE_EXISTS.httpStatus,
        ERROR_CODES.LICENSE_PLATE_EXISTS.message,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST); // BR-06

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).save({
        email,
        passwordHash,
        role: 'DRIVER',
        status: 'PENDING', // BR-07: tài khoản mới chưa được dùng cho tới khi hồ sơ được duyệt
      });

      const driverProfile = await manager.getRepository(DriverProfile).save({
        userId: user.id,
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        dateOfBirth: dto.dateOfBirth,
        citizenIdNumber: dto.citizenIdNumber,
        citizenIdIssueDate: dto.citizenIdIssueDate,
        driverLicenseNumber: dto.driverLicenseNumber,
        driverLicenseIssueDate: dto.driverLicenseIssueDate,
        temporaryAddress: dto.temporaryAddress ?? null,
        approvalStatus: 'PENDING',
      });

      await manager.getRepository(Vehicle).save({
        driverId: driverProfile.id,
        vehicleType: dto.vehicleType,
        brand: dto.vehicleBrand,
        modelName: dto.vehicleModelName,
        licensePlate: dto.vehicleLicensePlate,
        color: dto.vehicleColor ?? null,
        isActive: true,
        verificationStatus: 'PENDING',
      });

      return {
        userId: user.id,
        driverId: driverProfile.id,
        approvalStatus: driverProfile.approvalStatus,
        message: 'Hồ sơ đã được gửi. Vui lòng chờ quản trị viên duyệt.',
      };
    });
  }

  async refresh(dto: RefreshTokenDto): Promise<IssuedTokenPair> {
    return this.tokenService.rotateRefreshToken(dto.refreshToken);
  }

  async logout(userId: string, dto: RefreshTokenDto): Promise<void> {
    await this.tokenService.logout(dto.refreshToken, userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (
      !user ||
      !(await bcrypt.compare(dto.currentPassword, user.passwordHash))
    ) {
      throw new BusinessException(
        'CURRENT_PASSWORD_INVALID',
        ERROR_CODES.CURRENT_PASSWORD_INVALID.httpStatus,
        ERROR_CODES.CURRENT_PASSWORD_INVALID.message,
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_COST); // BR-06
    await this.userRepo.update(userId, { passwordHash });
    await this.tokenService.revokeAllForUser(userId); // BR-15
  }

  async getMe(userId: string): Promise<AuthenticatedUserView> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      user: this.toUserView(user),
      driver:
        user.role === 'DRIVER'
          ? await this.buildDriverView(user.id)
          : undefined,
    };
  }

  private toUserView(user: User): UserView {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }

  private async buildDriverView(
    userId: string,
  ): Promise<DriverView | undefined> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) {
      return undefined;
    }
    return {
      id: driver.id,
      fullName: driver.fullName,
      approvalStatus: driver.approvalStatus,
      isOnline: driver.isOnline,
      avatarUrl: driver.avatarUrl,
      rejectReason: driver.rejectReason,
    };
  }
}
