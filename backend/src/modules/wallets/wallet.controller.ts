import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApprovedDriverGuard } from '../../common/guards/approved-driver.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { WalletService } from './wallet.service';
import { TopupService } from './topup.service';
import { ListWalletTransactionsDto } from './dto/list-wallet-transactions.dto';
import { CreateTopupDto } from './dto/create-topup.dto';
import { IMAGE_UPLOAD_OPTIONS } from '../uploads/image-upload.options';

// API.md mục 8 — /wallet. Chỉ tài xế đã được duyệt (🚗).
@ApiTags('wallet')
@ApiBearerAuth()
@Roles('DRIVER')
@UseGuards(ApprovedDriverGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly topupService: TopupService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Số dư ví hiện tại', description: 'API.md mục 8.1' })
  async getWallet(@CurrentUser('userId') userId: string) {
    return this.walletService.getWalletView(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Lịch sử giao dịch', description: 'API.md mục 8.2' })
  async listTransactions(
    @CurrentUser('userId') userId: string,
    @Query() query: ListWalletTransactionsDto,
  ) {
    return this.walletService.listTransactions(userId, query);
  }

  @Post('topup')
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_OPTIONS))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tạo yêu cầu nạp tiền',
    description:
      'BR-68, BR-69, BR-70 — multipart/form-data, field "amount" + "file" (ảnh biên lai, tùy chọn)',
  })
  async createTopup(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTopupDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.topupService.create(userId, dto, file);
  }

  @Get('topup')
  @ApiOperation({ summary: 'Danh sách yêu cầu nạp của mình' })
  async listMyTopups(
    @CurrentUser('userId') userId: string,
    @Query() query: PaginationDto,
  ) {
    return this.topupService.listMine(userId, query);
  }
}
