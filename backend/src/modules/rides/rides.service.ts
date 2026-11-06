import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { Ride, RideStatus } from './entities/ride.entity';
import { RideStatusHistory } from './entities/ride-status-history.entity';
import { RideOffer } from './entities/ride-offer.entity';
import { Customer } from '../customers/entities/customer.entity';
import { FareCalculatorService, FareEstimate } from './fare-calculator.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { EstimateRideDto } from './dto/estimate-ride.dto';
import { CreateRideDto } from './dto/create-ride.dto';
import { RealtimeService } from '../realtime/realtime.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { ListMyRidesDto } from './dto/list-my-rides.dto';
import { ListAdminRidesDto } from './dto/list-admin-rides.dto';

// BR-37: giá Admin ghi đè phải nằm trong khoảng này. Không có trong bảng
// SystemConfig (BUSINESS-RULES.md mục 1) — là hằng số nghiệp vụ cố định
// trong chính văn bản BR-37, nên khai báo trực tiếp ở đây thay vì đọc qua
// SettingsService.
const FARE_OVERRIDE_MIN = 10_000;
const FARE_OVERRIDE_MAX = 5_000_000;

// Số lần thử lại tối đa khi sinh rideCode bị đụng độ (UQ_R_Code) do nhiều
// request tạo chuyến chạy đồng thời trong cùng một ngày.
const MAX_RIDE_CODE_ATTEMPTS = 5;

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export interface CreateRideResult {
  id: string;
  rideCode: string;
  status: Ride['status'];
  estimatedFare: number;
  dispatchRound: number;
  offersSent: number;
  createdAt: Date;
}

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);

  constructor(
    @InjectRepository(Ride) private readonly rideRepo: Repository<Ride>,
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    @InjectRepository(RideStatusHistory)
    private readonly rideStatusHistoryRepo: Repository<RideStatusHistory>,
    @InjectRepository(RideOffer)
    private readonly rideOfferRepo: Repository<RideOffer>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly fareCalculatorService: FareCalculatorService,
    private readonly realtimeService: RealtimeService,
    private readonly dispatchService: DispatchService,
  ) {}

  async findAllAdmin(query: ListAdminRidesDto): Promise<{
    data: Record<string, unknown>[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page, limit, order, status, from, to, search } = query;
    const qb = this.rideRepo
      .createQueryBuilder('ride')
      .leftJoinAndSelect('ride.customer', 'customer')
      .leftJoinAndSelect('ride.driver', 'driver')
      .leftJoinAndSelect('ride.vehicle', 'vehicle');

    if (status) {
      qb.andWhere('ride.status = :status', { status });
    }
    if (from) {
      qb.andWhere('ride.createdAt >= :from', {
        from: new Date(`${from.slice(0, 10)}T00:00:00.000Z`),
      });
    }
    if (to) {
      qb.andWhere('ride.createdAt < :to', {
        to: new Date(
          new Date(`${to.slice(0, 10)}T00:00:00.000Z`).getTime() +
            24 * 60 * 60 * 1000,
        ),
      });
    }
    if (search) {
      qb.andWhere(
        '(ride.rideCode LIKE :search OR customer.fullName LIKE :search OR customer.phoneNumber LIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('ride.createdAt', order.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [rides, total] = await qb.getManyAndCount();

    return {
      data: rides.map((ride) => this.toAdminRideView(ride)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAdminById(rideId: string): Promise<Record<string, unknown>> {
    const ride = await this.rideRepo.findOne({
      where: { id: rideId },
      relations: ['customer', 'driver', 'vehicle'],
    });
    if (!ride) {
      throw new NotFoundException('Không tìm thấy chuyến xe');
    }

    const [history, offers] = await Promise.all([
      this.rideStatusHistoryRepo.find({
        where: { rideId },
        order: { changedAt: 'ASC' },
      }),
      this.rideOfferRepo.find({
        where: { rideId },
        relations: ['driver'],
        order: { round: 'ASC', offeredAt: 'ASC' },
      }),
    ]);

    return {
      ...this.toAdminRideView(ride),
      history,
      offers: offers.map((offer) => ({
        id: offer.id,
        status: offer.status,
        round: offer.round,
        distanceKm: offer.distanceKm === null ? null : Number(offer.distanceKm),
        offeredAt: offer.offeredAt,
        viewedAt: offer.viewedAt,
        respondedAt: offer.respondedAt,
        expiredAt: offer.expiredAt,
        driver: {
          id: offer.driver.id,
          fullName: offer.driver.fullName,
          phoneNumber: offer.driver.phoneNumber,
        },
      })),
    };
  }

  private toAdminRideView(ride: Ride): Record<string, unknown> {
    return {
      ...this.toDriverRideView(ride),
      createdAt: ride.createdAt,
      updatedAt: ride.updatedAt,
      dispatchRound: ride.dispatchRound,
      customer: ride.customer
        ? {
            id: ride.customer.id,
            fullName: ride.customer.fullName,
            phoneNumber: ride.customer.phoneNumber,
          }
        : null,
      driver: ride.driver
        ? {
            id: ride.driver.id,
            fullName: ride.driver.fullName,
            phoneNumber: ride.driver.phoneNumber,
          }
        : null,
    };
  }

  async findMine(
    userId: string,
    query: ListMyRidesDto,
  ): Promise<{
    data: Record<string, unknown>[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }

    const { page, limit, order, status, from, to } = query;
    const qb = this.rideRepo
      .createQueryBuilder('ride')
      .leftJoinAndSelect('ride.customer', 'customer')
      .leftJoinAndSelect('ride.vehicle', 'vehicle')
      .where('ride.driverId = :driverId', { driverId: driver.id });

    if (status) {
      qb.andWhere('ride.status = :status', { status });
    }
    if (from) {
      qb.andWhere('ride.createdAt >= :from', {
        from: new Date(`${from.slice(0, 10)}T00:00:00.000Z`),
      });
    }
    if (to) {
      qb.andWhere('ride.createdAt < :to', {
        to: new Date(
          new Date(`${to.slice(0, 10)}T00:00:00.000Z`).getTime() +
            24 * 60 * 60 * 1000,
        ),
      });
    }

    qb.orderBy('ride.createdAt', order.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [rides, total] = await qb.getManyAndCount();

    return {
      data: rides.map((ride) => this.toDriverRideView(ride)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findActiveMine(
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }

    const ride = await this.rideRepo.findOne({
      where: [
        { driverId: driver.id, status: 'ACCEPTED' },
        { driverId: driver.id, status: 'ARRIVED' },
        { driverId: driver.id, status: 'IN_PROGRESS' },
      ],
      relations: ['customer', 'vehicle'],
      order: { acceptedAt: 'DESC' },
    });
    return ride ? this.toDriverRideView(ride) : null;
  }

  async findMineById(
    userId: string,
    rideId: string,
  ): Promise<Record<string, unknown>> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }

    const ride = await this.rideRepo.findOne({
      where: { id: rideId },
      relations: ['customer', 'vehicle'],
    });
    if (!ride) {
      throw new NotFoundException('Không tìm thấy chuyến xe');
    }
    // BR-32: only the assigned driver may read a ride's details and history.
    if (ride.driverId !== driver.id) {
      throw new BusinessException(
        'NOT_RIDE_OWNER',
        ERROR_CODES.NOT_RIDE_OWNER.httpStatus,
        ERROR_CODES.NOT_RIDE_OWNER.message,
      );
    }

    return this.toDriverRideView(ride);
  }

  async findMineHistory(
    userId: string,
    rideId: string,
  ): Promise<RideStatusHistory[]> {
    await this.findMineById(userId, rideId);
    return this.rideStatusHistoryRepo.find({
      where: { rideId },
      order: { changedAt: 'ASC' },
    });
  }

  private toDriverRideView(ride: Ride): Record<string, unknown> {
    return {
      id: ride.id,
      rideCode: ride.rideCode,
      status: ride.status as RideStatus,
      pickupAddress: ride.pickupAddress,
      pickupLatitude: Number(ride.pickupLatitude),
      pickupLongitude: Number(ride.pickupLongitude),
      dropoffAddress: ride.dropoffAddress,
      dropoffLatitude: Number(ride.dropoffLatitude),
      dropoffLongitude: Number(ride.dropoffLongitude),
      distanceKm: Number(ride.distanceKm),
      estimatedFare: Number(ride.estimatedFare),
      finalFare: ride.finalFare === null ? null : Number(ride.finalFare),
      platformFee: ride.platformFee === null ? null : Number(ride.platformFee),
      driverEarning:
        ride.driverEarning === null ? null : Number(ride.driverEarning),
      paymentMethod: ride.paymentMethod,
      acceptedAt: ride.acceptedAt,
      arrivedAt: ride.arrivedAt,
      startedAt: ride.startedAt,
      completedAt: ride.completedAt,
      cancelledAt: ride.cancelledAt,
      cancelledBy: ride.cancelledBy,
      cancelReason: ride.cancelReason,
      customer: ride.customer
        ? {
            fullName: ride.customer.fullName,
            phoneNumber: ride.customer.phoneNumber,
          }
        : null,
      vehicle: ride.vehicle
        ? {
            licensePlate: ride.vehicle.licensePlate,
            brand: ride.vehicle.brand,
            modelName: ride.vehicle.modelName,
          }
        : null,
    };
  }

  // API.md mục 7.1 — POST /admin/rides/estimate. BR-36.
  estimate(dto: EstimateRideDto): FareEstimate {
    return this.fareCalculatorService.estimate(dto.vehicleType, dto.distanceKm);
  }

  // API.md mục 7.2 — POST /admin/rides.
  // Toàn bộ: sinh rideCode + tạo Ride + ghi RideStatusHistory đầu tiên nằm
  // trong MỘT transaction (yêu cầu đề bài), dùng QueryRunner tường minh theo
  // đúng khuôn mẫu DriversService.approve() (BR-19).
  async create(
    dto: CreateRideDto,
    adminUserId: string,
  ): Promise<CreateRideResult> {
    const customer = await this.customerRepo.findOne({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }

    const estimatedFare = this.resolveEstimatedFare(dto);

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_RIDE_CODE_ATTEMPTS; attempt++) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const rideRepo = queryRunner.manager.getRepository(Ride);
        const historyRepo =
          queryRunner.manager.getRepository(RideStatusHistory);

        const rideCode = await this.generateRideCode(rideRepo);

        const ride = await rideRepo.save({
          rideCode,
          customerId: dto.customerId,
          pickupAddress: dto.pickupAddress,
          pickupLatitude: dto.pickupLatitude.toString(),
          pickupLongitude: dto.pickupLongitude.toString(),
          dropoffAddress: dto.dropoffAddress,
          dropoffLatitude: dto.dropoffLatitude.toString(),
          dropoffLongitude: dto.dropoffLongitude.toString(),
          vehicleType: dto.vehicleType,
          distanceKm: dto.distanceKm.toString(),
          estimatedDurationMinutes: dto.estimatedDurationMinutes ?? null,
          estimatedFare: estimatedFare.toString(),
          paymentMethod: dto.paymentMethod,
          status: 'SEARCHING',
          dispatchRound: 0,
          createdBy: adminUserId,
        });

        // BR-34: bản ghi RideStatusHistory đầu tiên, fromStatus = null.
        await historyRepo.save({
          rideId: ride.id,
          fromStatus: null,
          toStatus: 'SEARCHING',
          changedByType: 'ADMIN',
          changedById: adminUserId,
          note: null,
        });

        await queryRunner.commitTransaction();

        // API.md mục 7.2 — sự kiện Socket + điều phối PHẢI nằm SAU commit.
        this.realtimeService.emitRideCreated({
          id: ride.id,
          rideCode: ride.rideCode,
          status: ride.status,
          estimatedFare: Number(ride.estimatedFare),
          createdAt: ride.createdAt,
        });
        // BR-42 — chạy nền, KHÔNG await (không được chặn response tạo chuyến).
        this.dispatchService
          .startDispatch(ride.id)
          .catch((error) =>
            this.logger.error(`startDispatch(${ride.id}) thất bại`, error),
          );
        return {
          id: ride.id,
          rideCode: ride.rideCode,
          status: ride.status,
          estimatedFare: Number(ride.estimatedFare),
          dispatchRound: ride.dispatchRound,
          offersSent: 0,
          createdAt: ride.createdAt,
        };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        lastError = error;
        if (
          this.isDuplicateRideCodeError(error) &&
          attempt < MAX_RIDE_CODE_ATTEMPTS
        ) {
          continue;
        }
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    throw lastError;
  }

  // BR-37: estimatedFare null/undefined => tự tính theo BR-36; có giá trị
  // thì phải nằm trong [10.000, 5.000.000] hoặc ném FARE_OUT_OF_RANGE.
  private resolveEstimatedFare(dto: CreateRideDto): number {
    if (dto.estimatedFare === null || dto.estimatedFare === undefined) {
      return this.fareCalculatorService.estimate(
        dto.vehicleType,
        dto.distanceKm,
      ).estimatedFare;
    }

    if (
      dto.estimatedFare < FARE_OVERRIDE_MIN ||
      dto.estimatedFare > FARE_OVERRIDE_MAX
    ) {
      throw new BusinessException(
        'FARE_OUT_OF_RANGE',
        ERROR_CODES.FARE_OUT_OF_RANGE.httpStatus,
        ERROR_CODES.FARE_OUT_OF_RANGE.message,
      );
    }

    return dto.estimatedFare;
  }

  // Sinh rideCode dạng R{YYYYMMDD}-{0001}: ngày (UTC, khớp SYSUTCDATETIME()
  // dùng cho createdAt) + số thứ tự trong ngày, đếm từ các rideCode đã có.
  // Không tự đảm bảo an toàn tuyệt đối trước tranh chấp đồng thời chỉ bằng
  // phép đếm này — độ an toàn thực sự đến từ ràng buộc UNIQUE(rideCode) ở
  // tầng CSDL (UQ_R_Code) kết hợp vòng lặp retry ở create(): nếu hai request
  // cùng đếm ra cùng một số thứ tự, một trong hai sẽ bị CSDL từ chối và được
  // thử lại với số thứ tự mới.
  private async generateRideCode(rideRepo: Repository<Ride>): Promise<string> {
    const now = new Date();
    const datePart = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(
      now.getUTCDate(),
    )}`;
    const prefix = `R${datePart}-`;

    const count = await rideRepo.count({
      where: { rideCode: Like(`${prefix}%`) },
    });

    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private isDuplicateRideCodeError(error: unknown): boolean {
    return error instanceof Error && error.message.includes('UQ_R_Code');
  }
}
