import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApprovedDriverGuard } from '../../common/guards/approved-driver.guard';
import { RideOffersService } from './ride-offers.service';
import { RideStatusService } from './ride-status.service';
import { RideCancelService } from './ride-cancel.service';
import { UpdateRideStatusDto } from './dto/update-ride-status.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';
import { RidesService } from './rides.service';
import { ListMyRidesDto } from './dto/list-my-rides.dto';

// API.md mục 7 — các endpoint phía tài xế (🚗 ApprovedDriverGuard).
@ApiTags('rides')
@ApiBearerAuth()
@Roles('DRIVER')
@UseGuards(ApprovedDriverGuard)
@Controller('rides')
export class RidesDriverController {
  constructor(
    private readonly rideOffersService: RideOffersService,
    private readonly rideStatusService: RideStatusService,
    private readonly rideCancelService: RideCancelService,
    private readonly ridesService: RidesService,
  ) {}

  @Get('me/active')
  @ApiOperation({ summary: 'Chuyến đang thực hiện của tài xế (nếu có)' })
  async findActiveMine(@CurrentUser('userId') userId: string) {
    return this.ridesService.findActiveMine(userId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Lịch sử chuyến của tài xế' })
  async findMine(
    @CurrentUser('userId') userId: string,
    @Query() query: ListMyRidesDto,
  ) {
    return this.ridesService.findMine(userId, query);
  }

  @Get('offers')
  @ApiOperation({
    summary: 'Lời mời đang chờ của tài xế',
    description: 'API.md mục 7.3 — chỉ trả về lời mời còn hiệu lực',
  })
  async findOffers(@CurrentUser('userId') userId: string) {
    return this.rideOffersService.findActiveOffers(userId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Nhật ký trạng thái chuyến của tài xế' })
  async findHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.ridesService.findMineHistory(userId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết chuyến của tài xế' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.ridesService.findMineById(userId, id);
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu đã xem lời mời' })
  @ApiResponse({ status: 409, description: 'OFFER_EXPIRED' })
  async markViewed(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.rideOffersService.markViewed(id, userId);
  }

  @Post(':id/ignore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bỏ qua lời mời' })
  @ApiResponse({ status: 409, description: 'OFFER_EXPIRED' })
  async ignore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.rideOffersService.ignore(id, userId);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nhận chuyến',
    description: 'API.md mục 7.4 — endpoint quan trọng nhất, BR-45/46/47',
  })
  @ApiResponse({ status: 409, description: 'RIDE_ALREADY_TAKEN — BR-45' })
  @ApiResponse({ status: 409, description: 'OFFER_EXPIRED' })
  @ApiResponse({ status: 409, description: 'ACTIVE_RIDE_EXISTS — BR-47' })
  @ApiResponse({ status: 403, description: 'WALLET_BELOW_THRESHOLD — BR-47' })
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.rideOffersService.accept(id, userId);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái chuyến',
    description:
      'API.md mục 7.5 — ARRIVED | IN_PROGRESS | COMPLETED. COMPLETED kèm quyết toán ví (BR-59 -> BR-64) trong một transaction.',
  })
  @ApiResponse({ status: 409, description: 'INVALID_STATE_TRANSITION — BR-31' })
  @ApiResponse({ status: 403, description: 'NOT_RIDE_OWNER — BR-32' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRideStatusDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.rideStatusService.updateStatus(id, userId, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tài xế hủy chuyến đã nhận',
    description:
      'API.md mục 7.6 — BR-48/49/50/51. Chuyến quay về SEARCHING và được điều phối lại.',
  })
  @ApiResponse({
    status: 409,
    description: 'CANNOT_CANCEL_IN_PROGRESS — BR-49',
  })
  @ApiResponse({ status: 400, description: 'CANCEL_REASON_REQUIRED — BR-50' })
  @ApiResponse({ status: 403, description: 'NOT_RIDE_OWNER — BR-32' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRideDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.rideCancelService.cancelByDriver(id, userId, dto);
  }
}
