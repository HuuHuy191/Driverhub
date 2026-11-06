import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

// API.md mục 10 (#60) — GET /notifications?isRead=&page=&limit=
export class ListNotificationsDto extends PaginationDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  // Query string luôn là string ('true'/'false') — Boolean('false') === true
  // nên không thể dùng @Type(() => Boolean), phải tự chuyển đổi tường minh.
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isRead?: boolean;
}
