import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { WalletTransactionType } from '../entities/wallet-transaction.entity';

const TRANSACTION_TYPES: WalletTransactionType[] = [
  'COMMISSION_FEE',
  'COMMISSION_INCOME',
  'RIDE_EARNING',
  'TOPUP',
  'WITHDRAW',
  'ADJUSTMENT',
];

// API.md mục 8.2 — GET /wallet/transactions?type=&from=&page=&limit=
export class ListWalletTransactionsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TRANSACTION_TYPES })
  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: WalletTransactionType;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-18' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
