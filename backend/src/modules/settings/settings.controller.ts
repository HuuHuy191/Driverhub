import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

// API.md mục 9 — /admin/settings. Chỉ Admin (🛡️).
@ApiTags('admin-settings')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Toàn bộ tham số cấu hình',
    description: 'API.md mục 9 (#58)',
  })
  async findAll() {
    return this.settingsService.findAll();
  }

  @Patch(':key')
  @ApiOperation({
    summary: 'Cập nhật một tham số',
    description:
      'API.md mục 9 (#59) — BR-02: làm mới cache SettingsService ngay sau khi ghi. ' +
      'BR-60: chỉ áp dụng cho chuyến hoàn thành từ thời điểm này, chuyến cũ giữ nguyên tỷ lệ đã snapshot.',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tham số cấu hình' })
  async update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    const result = await this.settingsService.updateValue(key, dto.value);
    return {
      ...result,
      note:
        'Chỉ áp dụng cho các chuyến hoàn thành từ thời điểm này. Các chuyến đã hoàn thành giữ nguyên tỷ lệ đã ghi nhận.',
    };
  }
}
