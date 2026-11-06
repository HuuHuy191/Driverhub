import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';

// API.md mục 10 — /notifications. 👤 = cần đăng nhập, mọi vai trò (không
// @Roles() -> RolesGuard cho qua bất kỳ role nào, chỉ cần JwtAuthGuard xác
// thực được).
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo', description: 'API.md mục 10 (#60)' })
  async list(
    @CurrentUser('userId') userId: string,
    @Query() query: ListNotificationsDto,
  ) {
    return this.notificationsService.list(userId, query);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc', description: 'API.md mục 10 (#61)' })
  async markRead(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(userId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả đã đọc', description: 'API.md mục 10 (#62)' })
  async markAllRead(@CurrentUser('userId') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
