import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

// API.md mục 6 (#31) — GET /admin/customers?search=&page=&limit=
export class ListCustomersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Tìm theo họ tên hoặc số điện thoại',
    example: '0987',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;
}
