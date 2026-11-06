import {
  Body,
  Controller,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DriversService } from './drivers.service';
import { ListDriversDto } from './dto/list-drivers.dto';
import { RejectDriverDto } from './dto/reject-driver.dto';
import { LockDriverDto } from './dto/lock-driver.dto';

// API.md mục 4 — /admin/drivers. Chỉ Admin (🛡️). JwtAuthGuard + RolesGuard
// đã đăng ký global trong AppModule, chỉ cần khai báo @Roles('ADMIN').
@ApiTags('admin-drivers')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách tài xế, có lọc',
    description:
      'API.md mục 4.1 — lọc theo approvalStatus, isOnline, search + phân trang',
  })
  async findAll(@Query() query: ListDriversDto) {
    return this.driversService.findAll(query);
  }

  // Khai báo TRƯỚC ':id' — Nest khớp route theo thứ tự đăng ký, nếu để sau
  // ':id' thì "online" sẽ bị nuốt làm giá trị :id.
  @Get('online')
  @ApiOperation({
    summary: 'Tài xế đang online kèm vị trí',
    description: 'API.md mục 4 (#25)',
  })
  async findOnline() {
    return this.driversService.findOnline();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết hồ sơ kèm giấy tờ' })
  @ApiResponse({
    status: 404,
    description: 'NOT_FOUND — không tìm thấy tài xế',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.driversService.findOne(id);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Duyệt hồ sơ',
    description:
      'API.md mục 4.2 — BR-19: 5 tác dụng phụ trong một transaction duy nhất',
  })
  @ApiResponse({
    status: 409,
    description:
      'INVALID_STATE_TRANSITION — hồ sơ không ở trạng thái PENDING (BR-17)',
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.driversService.approve(id, adminUserId);
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Từ chối hồ sơ',
    description: 'API.md mục 4.3 — BR-18',
  })
  @ApiResponse({ status: 400, description: 'REJECT_REASON_REQUIRED — BR-18' })
  @ApiResponse({
    status: 409,
    description:
      'INVALID_STATE_TRANSITION — hồ sơ không ở trạng thái PENDING (BR-17)',
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDriverDto,
  ) {
    return this.driversService.reject(id, dto);
  }

  @Patch(':id/lock')
  @ApiOperation({ summary: 'Khóa / mở khóa tài khoản', description: 'BR-21' })
  @ApiResponse({
    status: 409,
    description: 'ACTIVE_RIDE_EXISTS — tài xế đang có chuyến dở dang (BR-21)',
  })
  async setLock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LockDriverDto,
  ) {
    return this.driversService.setLock(id, dto);
  }
}
