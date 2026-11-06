import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { WalletService } from './wallet.service';

// API.md mục 8.3 — GET /admin/wallet/platform. Chỉ Admin (🛡️).
@ApiTags('admin-wallet')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/wallet')
export class AdminWalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('platform')
  @ApiOperation({ summary: 'Ví nền tảng và doanh thu' })
  async getPlatformOverview() {
    return this.walletService.getPlatformOverview();
  }
}
