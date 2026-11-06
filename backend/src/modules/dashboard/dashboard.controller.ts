import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

// API.md mục 11 — /admin/dashboard. Chỉ Admin (🛡️).
@ApiTags('admin-dashboard')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Số liệu tổng quan', description: 'API.md mục 11 (#63)' })
  async getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('dispatch-stats')
  @ApiOperation({
    summary: 'Hiệu quả điều phối theo vòng',
    description: 'API.md mục 11 (#64) — DATABASE.md mục 8.3',
  })
  async getDispatchStats() {
    return this.dashboardService.getDispatchStats();
  }
}
