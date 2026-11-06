import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

// API.md mục 7.5 — PATCH /rides/:id/status. Bảng chuyển trạng thái được phép
// gửi từ phía tài xế: ACCEPTED->ARRIVED->IN_PROGRESS->COMPLETED.
const UPDATABLE_STATUSES = ['ARRIVED', 'IN_PROGRESS', 'COMPLETED'] as const;

export type UpdatableRideStatus = (typeof UPDATABLE_STATUSES)[number];

export class UpdateRideStatusDto {
  @ApiProperty({ enum: UPDATABLE_STATUSES })
  @IsIn(UPDATABLE_STATUSES)
  status: UpdatableRideStatus;
}
