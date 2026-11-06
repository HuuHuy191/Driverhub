import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

// API.md mục 3.2 — GET /drivers/me/stats?from=&to=&groupBy=day
export class ListDriverStatsDto {
  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-18' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ['day'], default: 'day' })
  @IsOptional()
  @IsIn(['day'])
  groupBy?: 'day' = 'day' as const;
}
