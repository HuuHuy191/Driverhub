import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { RideStatus } from '../entities/ride.entity';

const RIDE_STATUSES: RideStatus[] = [
  'SEARCHING',
  'ACCEPTED',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_DRIVER_FOUND',
];

export class ListAdminRidesDto extends PaginationDto {
  @IsOptional()
  @IsIn(RIDE_STATUSES)
  status?: RideStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
