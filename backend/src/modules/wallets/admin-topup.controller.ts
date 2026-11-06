import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TopupService } from './topup.service';
import { RejectTopupDto } from './dto/reject-topup.dto';

// API.md mục 8 — /admin/topup. Chỉ Admin (🛡️).
@ApiTags('admin-topup')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/topup')
export class AdminTopupController {
  constructor(private readonly topupService: TopupService) {}

  @Get()
  @ApiOperation({ summary: 'Yêu cầu nạp chờ duyệt' })
  async listPending(@Query() query: PaginationDto) {
    return this.topupService.listPending(query);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Duyệt yêu cầu nạp',
    description:
      'BR-68 — trong transaction gọi WalletService.applyTransaction(TOPUP, CREDIT)',
  })
  @ApiResponse({
    status: 409,
    description: 'INVALID_STATE_TRANSITION — không còn ở PENDING',
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.topupService.approve(id, adminUserId);
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Từ chối yêu cầu nạp',
    description: 'Bắt buộc có lý do',
  })
  @ApiResponse({
    status: 409,
    description: 'INVALID_STATE_TRANSITION — không còn ở PENDING',
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectTopupDto,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.topupService.reject(id, dto, adminUserId);
  }
}
