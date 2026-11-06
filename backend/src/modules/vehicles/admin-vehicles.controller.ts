import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { VehiclesService } from './vehicles.service';
import { VerifyVehicleDto } from './dto/verify-vehicle.dto';

// API.md mục 5 (#30) — /admin/vehicles. Chỉ Admin (🛡️).
@ApiTags('admin-vehicles')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/vehicles')
export class AdminVehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Patch(':id/verify')
  @ApiOperation({
    summary: 'Duyệt / từ chối xe',
    description: 'API.md mục 5 (#30) — BR-24, từ chối bắt buộc có lý do',
  })
  @ApiResponse({ status: 400, description: 'REJECT_REASON_REQUIRED' })
  @ApiResponse({
    status: 409,
    description: 'INVALID_STATE_TRANSITION — xe không ở trạng thái PENDING',
  })
  async verify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyVehicleDto,
  ) {
    return this.vehiclesService.verify(id, dto);
  }
}
