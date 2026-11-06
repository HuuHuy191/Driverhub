import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import {
  ALLOWED_TRANSITIONS,
  assertTransition,
  isTerminal,
  RideActor,
  RideStatus,
} from './ride-state-machine';

const ALL_STATUSES: RideStatus[] = [
  'SEARCHING',
  'ACCEPTED',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_DRIVER_FOUND',
];

function expectBlocked(
  from: RideStatus,
  to: RideStatus,
  actor: RideActor,
): void {
  let caught: unknown;
  try {
    assertTransition(from, to, actor);
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(BusinessException);
  const businessError = caught as BusinessException;
  expect(businessError.errorCode).toBe('INVALID_STATE_TRANSITION');
  expect(businessError.getStatus()).toBe(
    ERROR_CODES.INVALID_STATE_TRANSITION.httpStatus,
  );
}

describe('assertTransition — BUSINESS-RULES.md mục 6.2 (BR-31 đến BR-35)', () => {
  it('SEARCHING -> ACCEPTED hợp lệ khi actor là DRIVER (tài xế nhận chuyến)', () => {
    expect(() =>
      assertTransition('SEARCHING', 'ACCEPTED', 'DRIVER'),
    ).not.toThrow();
  });

  it('SEARCHING -> CANCELLED chỉ ADMIN được phép, DRIVER thì không (chưa được gán)', () => {
    expect(() =>
      assertTransition('SEARCHING', 'CANCELLED', 'ADMIN'),
    ).not.toThrow();
    expectBlocked('SEARCHING', 'CANCELLED', 'DRIVER');
  });

  it('SEARCHING -> NO_DRIVER_FOUND chỉ hệ thống được phép (hết vòng điều phối)', () => {
    expect(() =>
      assertTransition('SEARCHING', 'NO_DRIVER_FOUND', 'SYSTEM'),
    ).not.toThrow();
    expectBlocked('SEARCHING', 'NO_DRIVER_FOUND', 'ADMIN');
  });

  it('ACCEPTED -> COMPLETED PHẢI BỊ CHẶN (nhảy cóc, không có trong bảng)', () => {
    expectBlocked('ACCEPTED', 'COMPLETED', 'DRIVER');
    expectBlocked('ACCEPTED', 'COMPLETED', 'ADMIN');
  });

  it('ACCEPTED -> ARRIVED chỉ tài xế được gán, ACCEPTED -> CANCELLED cho cả ADMIN và DRIVER', () => {
    expect(() =>
      assertTransition('ACCEPTED', 'ARRIVED', 'DRIVER'),
    ).not.toThrow();
    expectBlocked('ACCEPTED', 'ARRIVED', 'ADMIN');
    expect(() =>
      assertTransition('ACCEPTED', 'CANCELLED', 'ADMIN'),
    ).not.toThrow();
    expect(() =>
      assertTransition('ACCEPTED', 'CANCELLED', 'DRIVER'),
    ).not.toThrow();
  });

  it('ACCEPTED -> SEARCHING chỉ hệ thống được phép (BR-45: tài xế hủy thì điều phối lại)', () => {
    expect(() =>
      assertTransition('ACCEPTED', 'SEARCHING', 'SYSTEM'),
    ).not.toThrow();
    expectBlocked('ACCEPTED', 'SEARCHING', 'DRIVER');
    expectBlocked('ACCEPTED', 'SEARCHING', 'ADMIN');
  });

  it('ARRIVED -> IN_PROGRESS chỉ tài xế được phép, ADMIN thì không', () => {
    expect(() =>
      assertTransition('ARRIVED', 'IN_PROGRESS', 'DRIVER'),
    ).not.toThrow();
    expectBlocked('ARRIVED', 'IN_PROGRESS', 'ADMIN');
    expectBlocked('ARRIVED', 'IN_PROGRESS', 'SYSTEM');
  });

  it('ARRIVED -> CANCELLED cho ADMIN/DRIVER, ARRIVED -> SEARCHING chỉ hệ thống', () => {
    expect(() =>
      assertTransition('ARRIVED', 'CANCELLED', 'ADMIN'),
    ).not.toThrow();
    expect(() =>
      assertTransition('ARRIVED', 'CANCELLED', 'DRIVER'),
    ).not.toThrow();
    expect(() =>
      assertTransition('ARRIVED', 'SEARCHING', 'SYSTEM'),
    ).not.toThrow();
    expectBlocked('ARRIVED', 'SEARCHING', 'DRIVER');
  });

  it('IN_PROGRESS -> CANCELLED PHẢI BỊ CHẶN (BR-49: khách đã lên xe, không được hủy)', () => {
    expectBlocked('IN_PROGRESS', 'CANCELLED', 'ADMIN');
    expectBlocked('IN_PROGRESS', 'CANCELLED', 'DRIVER');
    expectBlocked('IN_PROGRESS', 'CANCELLED', 'SYSTEM');
  });

  it('IN_PROGRESS -> COMPLETED chỉ tài xế được gán mới được phép', () => {
    expect(() =>
      assertTransition('IN_PROGRESS', 'COMPLETED', 'DRIVER'),
    ).not.toThrow();
    expectBlocked('IN_PROGRESS', 'COMPLETED', 'ADMIN');
  });

  it('COMPLETED -> bất kỳ trạng thái nào đều bị chặn (trạng thái kết thúc)', () => {
    const actors: RideActor[] = ['ADMIN', 'DRIVER', 'SYSTEM'];
    for (const to of ALL_STATUSES) {
      for (const actor of actors) {
        expectBlocked('COMPLETED', to, actor);
      }
    }
  });

  it('CANCELLED và NO_DRIVER_FOUND cũng là trạng thái kết thúc, không có lối ra', () => {
    expect(ALLOWED_TRANSITIONS.CANCELLED).toHaveLength(0);
    expect(ALLOWED_TRANSITIONS.NO_DRIVER_FOUND).toHaveLength(0);
    expectBlocked('CANCELLED', 'SEARCHING', 'ADMIN');
    expectBlocked('NO_DRIVER_FOUND', 'SEARCHING', 'SYSTEM');
  });
});

describe('isTerminal', () => {
  it('trả về true cho COMPLETED, CANCELLED, NO_DRIVER_FOUND', () => {
    expect(isTerminal('COMPLETED')).toBe(true);
    expect(isTerminal('CANCELLED')).toBe(true);
    expect(isTerminal('NO_DRIVER_FOUND')).toBe(true);
  });

  it('trả về false cho các trạng thái còn chuyển tiếp được', () => {
    expect(isTerminal('SEARCHING')).toBe(false);
    expect(isTerminal('ACCEPTED')).toBe(false);
    expect(isTerminal('ARRIVED')).toBe(false);
    expect(isTerminal('IN_PROGRESS')).toBe(false);
  });
});
