import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VerifyVehicleDto } from './dto/verify-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // API.md mục 5 (#26) — GET /vehicles/me.
  async findMine(userId: string): Promise<Vehicle[]> {
    const driver = await this.resolveDriverProfile(userId);
    return this.vehicleRepo.find({
      where: { driverId: driver.id },
      order: { createdAt: 'ASC' },
    });
  }

  // API.md mục 5 (#27) — POST /vehicles. Xe thêm sau lúc đăng ký mặc định
  // CHƯA hoạt động (isActive=false) — tài xế tự chọn kích hoạt sau
  // (PATCH /vehicles/:id/activate, BR-23), tránh vi phạm filtered unique
  // index nếu đã có sẵn một xe đang hoạt động.
  async create(userId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const driver = await this.resolveDriverProfile(userId);

    const existingPlate = await this.vehicleRepo.findOne({
      where: { licensePlate: dto.licensePlate },
    });
    if (existingPlate) {
      throw new BusinessException(
        'LICENSE_PLATE_EXISTS',
        ERROR_CODES.LICENSE_PLATE_EXISTS.httpStatus,
        ERROR_CODES.LICENSE_PLATE_EXISTS.message,
      );
    }

    return this.vehicleRepo.save({
      driverId: driver.id,
      vehicleType: dto.vehicleType,
      brand: dto.brand,
      modelName: dto.modelName,
      licensePlate: dto.licensePlate,
      color: dto.color ?? null,
      isActive: false,
      verificationStatus: 'PENDING',
    });
  }

  // API.md mục 5 (#28) — PATCH /vehicles/:id.
  async update(
    userId: string,
    vehicleId: string,
    dto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const vehicle = await this.resolveOwnedVehicle(userId, vehicleId);

    if (dto.licensePlate && dto.licensePlate !== vehicle.licensePlate) {
      const existingPlate = await this.vehicleRepo.findOne({
        where: { licensePlate: dto.licensePlate },
      });
      if (existingPlate) {
        throw new BusinessException(
          'LICENSE_PLATE_EXISTS',
          ERROR_CODES.LICENSE_PLATE_EXISTS.httpStatus,
          ERROR_CODES.LICENSE_PLATE_EXISTS.message,
        );
      }
    }

    const updated: Vehicle = {
      ...vehicle,
      brand: dto.brand ?? vehicle.brand,
      modelName: dto.modelName ?? vehicle.modelName,
      licensePlate: dto.licensePlate ?? vehicle.licensePlate,
      color: dto.color ?? vehicle.color,
    };
    await this.vehicleRepo.update(vehicle.id, {
      brand: updated.brand,
      modelName: updated.modelName,
      licensePlate: updated.licensePlate,
      color: updated.color,
    });

    return updated;
  }

  // API.md mục 5 (#29) — PATCH /vehicles/:id/activate. BR-23: trong CÙNG
  // transaction, chuyển mọi xe khác của tài xế về isActive=0 TRƯỚC khi bật
  // xe này — thứ tự này bắt buộc để không vi phạm filtered unique index
  // UX_Vehicle_ActivePerDriver (không thể có 2 dòng isActive=1 cùng lúc).
  async activate(
    userId: string,
    vehicleId: string,
  ): Promise<{ id: string; isActive: true }> {
    const driver = await this.resolveDriverProfile(userId);
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Không tìm thấy xe');
    }
    if (vehicle.driverId !== driver.id) {
      throw new ForbiddenException('Đây không phải xe của bạn');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .update(Vehicle)
        .set({ isActive: false })
        .where('driverId = :driverId', { driverId: driver.id })
        .andWhere('id <> :id', { id: vehicleId })
        .execute();

      await queryRunner.manager.update(Vehicle, vehicleId, { isActive: true });

      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }

    return { id: vehicleId, isActive: true };
  }

  // API.md mục 5 (#30) — PATCH /admin/vehicles/:id/verify. BR-24.
  async verify(
    vehicleId: string,
    dto: VerifyVehicleDto,
  ): Promise<{ id: string; verificationStatus: string; reason?: string }> {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Không tìm thấy xe');
    }
    if (vehicle.verificationStatus !== 'PENDING') {
      throw new BusinessException(
        'INVALID_STATE_TRANSITION',
        ERROR_CODES.INVALID_STATE_TRANSITION.httpStatus,
        ERROR_CODES.INVALID_STATE_TRANSITION.message,
      );
    }

    let reason: string | undefined;
    if (dto.verificationStatus === 'REJECTED') {
      const trimmed = dto.reason?.trim();
      if (!trimmed || trimmed.length < 10) {
        throw new BusinessException(
          'REJECT_REASON_REQUIRED',
          ERROR_CODES.REJECT_REASON_REQUIRED.httpStatus,
          ERROR_CODES.REJECT_REASON_REQUIRED.message,
        );
      }
      reason = trimmed;
    }

    // GHI CHÚ: Vehicle không có cột rejectReason trong schema hiện tại
    // (khác DriverProfile/DriverDocument) — lý do từ chối chỉ được xác thực
    // và trả về trong response, không có nơi lưu lại lâu dài ở tầng CSDL.
    await this.vehicleRepo.update(vehicleId, {
      verificationStatus: dto.verificationStatus,
    });

    return { id: vehicleId, verificationStatus: dto.verificationStatus, reason };
  }

  private async resolveDriverProfile(userId: string): Promise<DriverProfile> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }
    return driver;
  }

  private async resolveOwnedVehicle(
    userId: string,
    vehicleId: string,
  ): Promise<Vehicle> {
    const driver = await this.resolveDriverProfile(userId);
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Không tìm thấy xe');
    }
    if (vehicle.driverId !== driver.id) {
      throw new ForbiddenException('Đây không phải xe của bạn');
    }
    return vehicle;
  }
}
