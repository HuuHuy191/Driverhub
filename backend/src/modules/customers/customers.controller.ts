import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersDto } from './dto/list-customers.dto';

// API.md mục 6 — /admin/customers. Chỉ Admin (🛡️).
@ApiTags('admin-customers')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách khách hàng mô phỏng' })
  async findAll(@Query() query: ListCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo khách hàng' })
  @ApiResponse({ status: 409, description: 'PHONE_ALREADY_EXISTS' })
  async create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa thông tin khách' })
  @ApiResponse({ status: 409, description: 'PHONE_ALREADY_EXISTS' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa khách chưa gắn chuyến nào' })
  @ApiResponse({
    status: 409,
    description: 'CUSTOMER_HAS_RIDES — khách đã có chuyến, không thể xóa',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.remove(id);
  }
}
