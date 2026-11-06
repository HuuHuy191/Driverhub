import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApprovedDriverGuard } from '../../common/guards/approved-driver.guard';
import { DriverStatusService } from './driver-status.service';
import { DriverStatsService } from './driver-stats.service';
import { DriverDocumentsService } from './driver-documents.service';
import { SetOnlineStatusDto } from './dto/set-online-status.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ListDriverStatsDto } from './dto/list-driver-stats.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { DriversService } from './drivers.service';
import { IMAGE_UPLOAD_OPTIONS } from '../uploads/image-upload.options';

// API.md mục 3 — /drivers/me. Chỉ tài xế đã được duyệt (🚗).
@ApiTags('drivers-me')
@ApiBearerAuth()
@Roles('DRIVER')
@Controller('drivers/me')
export class DriversMeController {
  constructor(
    private readonly driverStatusService: DriverStatusService,
    private readonly driverStatsService: DriverStatsService,
    private readonly driverDocumentsService: DriverDocumentsService,
    private readonly driversService: DriversService,
  ) {}

  @Get()
  async getMyProfile(@CurrentUser('userId') userId: string) {
    return this.driversService.getMyProfile(userId);
  }

  @Patch()
  async updateMyProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateMyProfileDto,
  ) {
    return this.driversService.updateMyProfile(userId, dto);
  }

  @Patch('status')
  @UseGuards(ApprovedDriverGuard)
  @ApiOperation({
    summary: 'Bật / tắt trạng thái online',
    description: 'API.md mục 3.1 — BR-26 (bật), BR-30 (tắt)',
  })
  @ApiResponse({
    status: 400,
    description: 'NO_ACTIVE_VEHICLE · LOCATION_REQUIRED — BR-26',
  })
  @ApiResponse({
    status: 403,
    description: 'ACCOUNT_NOT_APPROVED · WALLET_BELOW_THRESHOLD — BR-26',
  })
  @ApiResponse({ status: 409, description: 'ACTIVE_RIDE_EXISTS — BR-30' })
  async setStatus(
    @CurrentUser('userId') userId: string,
    @Body() dto: SetOnlineStatusDto,
  ) {
    return this.driverStatusService.setOnlineStatus(userId, dto);
  }

  @Patch('location')
  @ApiOperation({
    summary: '[TẠM THỜI] Cập nhật vị trí',
    description:
      'BR-27 — thay bằng sự kiện Socket driver:location khi có Socket.IO',
  })
  async updateLocation(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.driverStatusService.updateLocation(userId, dto);
  }

  @Get('stats')
  @UseGuards(ApprovedDriverGuard)
  @ApiOperation({
    summary: 'Thống kê thu nhập của bản thân',
    description: 'API.md mục 3.2 — BR-60: đọc từ cột snapshot của Ride',
  })
  async getStats(
    @CurrentUser('userId') userId: string,
    @Query() query: ListDriverStatsDto,
  ) {
    return this.driverStatsService.getStats(userId, query);
  }

  @Get('documents')
  @ApiOperation({
    summary: 'Danh sách giấy tờ đã nộp',
    description:
      'API.md mục 3 (#14) — trạng thái và lý do từ chối từng giấy tờ',
  })
  async listDocuments(@CurrentUser('userId') userId: string) {
    return this.driverDocumentsService.listDocuments(userId);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_OPTIONS))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tải ảnh đại diện',
    description: 'API.md mục 3 (#13) — multipart/form-data, field "file"',
  })
  async uploadAvatar(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.driverDocumentsService.updateAvatar(userId, file);
  }

  @Post('resubmit')
  @ApiOperation({
    summary: 'Gửi lại hồ sơ sau khi bị từ chối',
    description:
      'BR-17 — cần đủ thông tin CCCD và giấy phép lái xe trước khi gửi lại',
  })
  @ApiResponse({
    status: 400,
    description: 'IDENTITY_INFORMATION_INCOMPLETE — BR-16',
  })
  async resubmit(@CurrentUser('userId') userId: string) {
    return this.driversService.resubmitProfile(userId);
  }
}
