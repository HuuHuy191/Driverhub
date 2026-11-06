import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { Ride } from '../rides/entities/ride.entity';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersDto } from './dto/list-customers.dto';
import { PaginationMeta } from '../drivers/drivers.service';

const SORTABLE_COLUMNS: Record<string, string> = {
  createdAt: 'customer.createdAt',
  fullName: 'customer.fullName',
};

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Ride) private readonly rideRepo: Repository<Ride>,
  ) {}

  // API.md mục 6 (#31) — GET /admin/customers
  async findAll(
    query: ListCustomersDto,
  ): Promise<{ data: Customer[]; meta: PaginationMeta }> {
    const { page, limit, sort, order, search } = query;

    const qb = this.customerRepo.createQueryBuilder('customer');
    if (search) {
      qb.andWhere(
        '(customer.fullName LIKE :search OR customer.phoneNumber LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const sortColumn = SORTABLE_COLUMNS[sort] ?? SORTABLE_COLUMNS.createdAt;
    qb.orderBy(sortColumn, order.toUpperCase() as 'ASC' | 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // API.md mục 6 (#32) — POST /admin/customers
  async create(dto: CreateCustomerDto): Promise<Customer> {
    await this.assertPhoneAvailable(dto.phoneNumber);

    return this.customerRepo.save({
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      avatarUrl: dto.avatarUrl ?? null,
      note: dto.note ?? null,
    });
  }

  // API.md mục 6 (#33) — PATCH /admin/customers/:id
  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOneOrFail(id);

    if (dto.phoneNumber && dto.phoneNumber !== customer.phoneNumber) {
      await this.assertPhoneAvailable(dto.phoneNumber);
    }

    await this.customerRepo.update(id, {
      fullName: dto.fullName ?? customer.fullName,
      phoneNumber: dto.phoneNumber ?? customer.phoneNumber,
      avatarUrl: dto.avatarUrl ?? customer.avatarUrl,
      note: dto.note ?? customer.note,
    });

    return this.findOneOrFail(id);
  }

  // API.md mục 6 (#34) — DELETE /admin/customers/:id. Chỉ xóa được khách
  // chưa gắn chuyến nào, ngược lại 409 CUSTOMER_HAS_RIDES.
  async remove(id: string): Promise<{ id: string; deleted: true }> {
    await this.findOneOrFail(id);

    const rideCount = await this.rideRepo.count({ where: { customerId: id } });
    if (rideCount > 0) {
      throw new BusinessException(
        'CUSTOMER_HAS_RIDES',
        ERROR_CODES.CUSTOMER_HAS_RIDES.httpStatus,
        ERROR_CODES.CUSTOMER_HAS_RIDES.message,
      );
    }

    await this.customerRepo.delete(id);
    return { id, deleted: true };
  }

  private async findOneOrFail(id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }
    return customer;
  }

  // UQ_C_Phone (DATABASE.md mục 4.9) — kiểm tra trước để trả lỗi nghiệp vụ rõ
  // ràng thay vì để CSDL ném lỗi ràng buộc thô.
  private async assertPhoneAvailable(phoneNumber: string): Promise<void> {
    const existing = await this.customerRepo.findOne({
      where: { phoneNumber },
    });
    if (existing) {
      throw new BusinessException(
        'PHONE_ALREADY_EXISTS',
        ERROR_CODES.PHONE_ALREADY_EXISTS.httpStatus,
        ERROR_CODES.PHONE_ALREADY_EXISTS.message,
      );
    }
  }
}
