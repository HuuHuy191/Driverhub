import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApprovedDriverGuard } from '../../common/guards/approved-driver.guard';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

// API.md mục 5 — /vehicles. ⏳ = tài xế kể cả khi chưa được duyệt (không cần
// ApprovedDriverGuard), riêng "activate" là 🚗 (chỉ tài xế đã duyệt).
@ApiTags('vehicles')
@ApiBearerAuth()
@Roles('DRIVER')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Danh sách xe của tài xế', description: 'API.md mục 5 (#26)' })
  async findMine(@CurrentUser('userId') userId: string) {
    return this.vehiclesService.findMine(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Thêm xe mới', description: 'API.md mục 5 (#27) — BR-22' })
  @ApiResponse({ status: 409, description: 'LICENSE_PLATE_EXISTS — BR-22' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa thông tin xe', description: 'API.md mục 5 (#28)' })
  @ApiResponse({ status: 409, description: 'LICENSE_PLATE_EXISTS — BR-22' })
  @ApiResponse({ status: 403, description: 'Không phải xe của tài xế này' })
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(userId, id, dto);
  }

  @Patch(':id/activate')
  @UseGuards(ApprovedDriverGuard)
  @ApiOperation({
    summary: 'Đặt xe này làm xe hoạt động',
    description:
      'API.md mục 5 (#29) — BR-23: các xe khác của tài xế tự chuyển isActive=0 trong cùng transaction',
  })
  @ApiResponse({ status: 403, description: 'Không phải xe của tài xế này' })
  async activate(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehiclesService.activate(userId, id);
  }
}
