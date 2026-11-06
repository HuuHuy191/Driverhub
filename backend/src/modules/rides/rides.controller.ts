import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RidesService } from './rides.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { RideCancelService } from './ride-cancel.service';
import { EstimateRideDto } from './dto/estimate-ride.dto';
import { CreateRideDto } from './dto/create-ride.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';
import { ListAdminRidesDto } from './dto/list-admin-rides.dto';

// API.md mục 7 — /admin/rides. Chỉ Admin (🛡️).
@ApiTags('admin-rides')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/rides')
export class RidesController {
  constructor(
    private readonly ridesService: RidesService,
    private readonly dispatchService: DispatchService,
    private readonly rideCancelService: RideCancelService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách chuyến, có lọc và phân trang',
    description: 'API.md mục 7 — chỉ Admin',
  })
  async findAll(@Query() query: ListAdminRidesDto) {
    return this.ridesService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Chi tiết chuyến, lịch sử trạng thái và lời mời',
    description: 'API.md mục 7 — chỉ Admin',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ridesService.findAdminById(id);
  }

  @Post('estimate')
  @ApiOperation({
    summary: 'Ước tính giá trước khi tạo',
    description: 'API.md mục 7.1 — áp dụng công thức BR-36',
  })
  estimate(@Body() dto: EstimateRideDto) {
    return this.ridesService.estimate(dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Admin tạo chuyến mô phỏng',
    description:
      'API.md mục 7.2 — sinh rideCode, tính giá (BR-36/BR-37), ghi RideStatusHistory (BR-34) trong transaction; bắt đầu điều phối nền sau commit.',
  })
  @ApiResponse({
    status: 400,
    description:
      'FARE_OUT_OF_RANGE — giá ghi đè ngoài khoảng 10.000đ–5.000.000đ (BR-37)',
  })
  async create(
    @Body() dto: CreateRideDto,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.ridesService.create(dto, adminUserId);
  }

  @Post(':id/redispatch')
  @ApiOperation({
    summary: 'Điều phối lại chuyến NO_DRIVER_FOUND',
    description: 'BR-42 — chạy lại toàn bộ vòng lặp điều phối từ đầu.',
  })
  @ApiResponse({
    status: 409,
    description: 'INVALID_STATE_TRANSITION — chuyến không ở NO_DRIVER_FOUND',
  })
  async redispatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.dispatchService.redispatch(id, adminUserId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin hủy chuyến',
    description:
      'API.md mục 7.7 — BR-48/49/50/52. Kết thúc hẳn, KHÔNG điều phối lại.',
  })
  @ApiResponse({ status: 409, description: 'CANNOT_CANCEL_IN_PROGRESS — BR-49' })
  @ApiResponse({ status: 400, description: 'CANCEL_REASON_REQUIRED — BR-50' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRideDto,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.rideCancelService.cancelByAdmin(id, adminUserId, dto);
  }
}
