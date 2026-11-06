import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DriverApprovalStatus } from '../entities/driver-profile.entity';

const APPROVAL_STATUSES: DriverApprovalStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
];

// API.md mục 4.1 — GET /admin/drivers?approvalStatus=&isOnline=&search=&page=&limit=
export class ListDriversDto extends PaginationDto {
  @ApiPropertyOptional({ enum: APPROVAL_STATUSES })
  @IsOptional()
  @IsIn(APPROVAL_STATUSES)
  approvalStatus?: DriverApprovalStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  // Query string luôn là string ('true'/'false') — Boolean('false') === true
  // nên không thể dùng @Type(() => Boolean), phải tự chuyển đổi tường minh.
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({
    description: 'Tìm theo họ tên, số điện thoại hoặc email',
    example: '0912',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;
}
