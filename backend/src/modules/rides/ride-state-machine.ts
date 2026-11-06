import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';

// entities/ride.entity.ts (DATABASE.md mục 4.10) là nguồn sự thật duy nhất
// cho tập 7 trạng thái — re-export để tránh khai báo trùng union.
export type { RideStatus } from './entities/ride.entity';
import type { RideStatus } from './entities/ride.entity';

// BUSINESS-RULES.md mục 6.2 — ai được phép thực hiện chuyển trạng thái.
// Không phải là kiểm tra quyền sở hữu chuyến cụ thể (đó là trách nhiệm riêng
// của BR-32, ví dụ "tài xế được gán" — xác minh Ride.driverId ở tầng service).
export type RideActor = 'ADMIN' | 'DRIVER' | 'SYSTEM';

interface TransitionRule {
  to: RideStatus;
  allowedActors: RideActor[];
}

// BUSINESS-RULES.md mục 6.2 — bảng chuyển trạng thái hợp lệ, đúng y hệt bảng
// gốc. Trạng thái không xuất hiện như key nguồn (bảng rỗng) là trạng thái
// kết thúc — không còn chuyển tiếp nào hợp lệ (BR-31).
export const ALLOWED_TRANSITIONS: Readonly<
  Record<RideStatus, readonly TransitionRule[]>
> = {
  SEARCHING: [
    { to: 'ACCEPTED', allowedActors: ['DRIVER'] },
    { to: 'CANCELLED', allowedActors: ['ADMIN'] },
    { to: 'NO_DRIVER_FOUND', allowedActors: ['SYSTEM'] },
  ],
  ACCEPTED: [
    { to: 'ARRIVED', allowedActors: ['DRIVER'] },
    { to: 'CANCELLED', allowedActors: ['ADMIN', 'DRIVER'] },
    // Hệ thống chuyển về SEARCHING khi tài xế hủy (BR-45).
    { to: 'SEARCHING', allowedActors: ['SYSTEM'] },
  ],
  ARRIVED: [
    { to: 'IN_PROGRESS', allowedActors: ['DRIVER'] },
    { to: 'CANCELLED', allowedActors: ['ADMIN', 'DRIVER'] },
    { to: 'SEARCHING', allowedActors: ['SYSTEM'] },
  ],
  IN_PROGRESS: [{ to: 'COMPLETED', allowedActors: ['DRIVER'] }],
  // BR-49: từ IN_PROGRESS chỉ có đúng một lối ra là COMPLETED — không có
  // đường CANCELLED ở đây.
  COMPLETED: [],
  CANCELLED: [],
  NO_DRIVER_FOUND: [],
};

// BR-31: chuyển trạng thái không có trong bảng trên đều bị từ chối, kể cả khi
// actor hợp lệ cho MỘT transition khác từ cùng trạng thái nguồn.
export function assertTransition(
  from: RideStatus,
  to: RideStatus,
  actor: RideActor,
): void {
  const rule = ALLOWED_TRANSITIONS[from].find(
    (candidate) => candidate.to === to,
  );
  if (!rule || !rule.allowedActors.includes(actor)) {
    throw new BusinessException(
      'INVALID_STATE_TRANSITION',
      ERROR_CODES.INVALID_STATE_TRANSITION.httpStatus,
      ERROR_CODES.INVALID_STATE_TRANSITION.message,
    );
  }
}

// Trạng thái kết thúc — không còn chuyển tiếp hợp lệ nào (mục 6.1).
const TERMINAL_STATUSES: ReadonlySet<RideStatus> = new Set([
  'COMPLETED',
  'CANCELLED',
  'NO_DRIVER_FOUND',
]);

export function isTerminal(status: RideStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}
