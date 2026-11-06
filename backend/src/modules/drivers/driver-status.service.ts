import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DriverProfile } from './entities/driver-profile.entity';
import { User } from '../users/entities/user.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Ride } from '../rides/entities/ride.entity';
import { SettingsService } from '../settings/settings.service';
import { RealtimeService } from '../realtime/realtime.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { SetOnlineStatusDto } from './dto/set-online-status.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

// BR-30: trạng thái coi là tài xế "đang có chuyến dở dang".
const ACTIVE_RIDE_STATUSES = ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] as const;

@Injectable()
export class DriverStatusService {
  constructor(
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Wallet) private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Ride) private readonly rideRepo: Repository<Ride>,
    private readonly settingsService: SettingsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  // API.md mục 3.1 — PATCH /drivers/me/status.
  async setOnlineStatus(
    userId: string,
    dto: SetOnlineStatusDto,
  ): Promise<{ isOnline: boolean; updatedAt: Date }> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }

    if (dto.isOnline) {
      return this.turnOnline(driver, userId, dto);
    }
    return this.turnOffline(driver);
  }

  // BR-26: ĐỦ 5 điều kiện, mỗi điều kiện một errorCode riêng. Điều kiện 1+2
  // thực ra đã được ApprovedDriverGuard (🚗) chặn từ trước khi vào tới đây —
  // vẫn kiểm tra lại ở service để đúng đủ 5 điều kiện BR-26 mô tả, phòng khi
  // endpoint được gọi qua đường khác trong tương lai.
  private async turnOnline(
    driver: DriverProfile,
    userId: string,
    dto: SetOnlineStatusDto,
  ): Promise<{ isOnline: boolean; updatedAt: Date }> {
    // 1. approvalStatus = 'APPROVED'
    if (driver.approvalStatus !== 'APPROVED') {
      throw new BusinessException(
        'ACCOUNT_NOT_APPROVED',
        ERROR_CODES.ACCOUNT_NOT_APPROVED.httpStatus,
        ERROR_CODES.ACCOUNT_NOT_APPROVED.message,
      );
    }

    // 2. User.status = 'ACTIVE'
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE') {
      throw new BusinessException(
        'ACCOUNT_LOCKED',
        ERROR_CODES.ACCOUNT_LOCKED.httpStatus,
        ERROR_CODES.ACCOUNT_LOCKED.message,
      );
    }

    // 3. Có ít nhất một xe isActive=1 và verificationStatus='APPROVED'
    const activeVehicle = await this.vehicleRepo.findOne({
      where: {
        driverId: driver.id,
        isActive: true,
        verificationStatus: 'APPROVED',
      },
    });
    if (!activeVehicle) {
      throw new BusinessException(
        'NO_ACTIVE_VEHICLE',
        ERROR_CODES.NO_ACTIVE_VEHICLE.httpStatus,
        ERROR_CODES.NO_ACTIVE_VEHICLE.message,
      );
    }

    // 4. Wallet.balance >= MAX_NEGATIVE_BALANCE
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    const maxNegativeBalance = this.settingsService.getNumber(
      'MAX_NEGATIVE_BALANCE',
    );
    if (!wallet || Number(wallet.balance) < maxNegativeBalance) {
      throw new BusinessException(
        'WALLET_BELOW_THRESHOLD',
        ERROR_CODES.WALLET_BELOW_THRESHOLD.httpStatus,
        ERROR_CODES.WALLET_BELOW_THRESHOLD.message,
      );
    }

    // 5. Body có latitude + longitude
    if (dto.latitude === undefined || dto.longitude === undefined) {
      throw new BusinessException(
        'LOCATION_REQUIRED',
        ERROR_CODES.LOCATION_REQUIRED.httpStatus,
        ERROR_CODES.LOCATION_REQUIRED.message,
      );
    }

    const now = new Date();
    await this.driverProfileRepo.update(driver.id, {
      isOnline: true,
      currentLatitude: dto.latitude.toString(),
      currentLongitude: dto.longitude.toString(),
      lastLocationUpdatedAt: now,
    });

    this.realtimeService.emitDriverStatusChanged({
      driverId: driver.id,
      fullName: driver.fullName,
      isOnline: true,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });

    return { isOnline: true, updatedAt: now };
  }

  // BR-30: không được tắt ONLINE khi đang có chuyến dở dang.
  private async turnOffline(
    driver: DriverProfile,
  ): Promise<{ isOnline: boolean; updatedAt: Date }> {
    const activeRideCount = await this.rideRepo.count({
      where: { driverId: driver.id, status: In([...ACTIVE_RIDE_STATUSES]) },
    });
    if (activeRideCount > 0) {
      throw new BusinessException(
        'ACTIVE_RIDE_EXISTS',
        ERROR_CODES.ACTIVE_RIDE_EXISTS.httpStatus,
        ERROR_CODES.ACTIVE_RIDE_EXISTS.message,
      );
    }

    await this.driverProfileRepo.update(driver.id, { isOnline: false });

    this.realtimeService.emitDriverStatusChanged({
      driverId: driver.id,
      fullName: driver.fullName,
      isOnline: false,
    });

    return { isOnline: false, updatedAt: new Date() };
  }

  // TẠM THỜI (REST) — API.md chưa có mục riêng, thay cho sự kiện Socket
  // driver:location (BR-27) cho tới khi Socket.IO được triển khai.
  async updateLocation(
    userId: string,
    dto: UpdateLocationDto,
  ): Promise<{ latitude: number; longitude: number; updatedAt: Date }> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }

    const now = new Date();
    await this.driverProfileRepo.update(driver.id, {
      currentLatitude: dto.latitude.toString(),
      currentLongitude: dto.longitude.toString(),
      lastLocationUpdatedAt: now,
    });

    return { latitude: dto.latitude, longitude: dto.longitude, updatedAt: now };
  }
}
