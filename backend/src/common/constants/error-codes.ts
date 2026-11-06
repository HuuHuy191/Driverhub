import { HttpStatus } from '@nestjs/common';

// BUSINESS-RULES.md mục 14 — Bảng tổng hợp mã lỗi nghiệp vụ.
// Mỗi khóa là errorCode client dùng để xử lý (KHÔNG phân tích chuỗi message).
export const ERROR_CODES = {
  INVALID_CREDENTIALS: {
    httpStatus: HttpStatus.UNAUTHORIZED,
    message: 'Email hoặc mật khẩu không đúng',
  }, // BR-11
  CURRENT_PASSWORD_INVALID: {
    httpStatus: HttpStatus.UNAUTHORIZED,
    message: 'Mật khẩu hiện tại không đúng',
  }, // BR-06
  ACCOUNT_LOCKED: {
    httpStatus: HttpStatus.FORBIDDEN,
    message: 'Tài khoản đã bị khóa',
  }, // BR-21
  ACCOUNT_NOT_APPROVED: {
    httpStatus: HttpStatus.FORBIDDEN,
    message: 'Hồ sơ của bạn đang chờ duyệt',
  }, // BR-07
  EMAIL_ALREADY_EXISTS: {
    httpStatus: HttpStatus.CONFLICT,
    message: 'Email đã được sử dụng',
  }, // BR-04
  PHONE_ALREADY_EXISTS: {
    httpStatus: HttpStatus.CONFLICT,
    message: 'Số điện thoại đã được sử dụng',
  }, // BR-05
  LICENSE_PLATE_EXISTS: {
    httpStatus: HttpStatus.CONFLICT,
    message: 'Biển số xe đã tồn tại',
  }, // BR-22
  IDENTITY_INFORMATION_INCOMPLETE: {
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Vui lòng bổ sung thông tin định danh',
  }, // BR-16
  REJECT_REASON_REQUIRED: {
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Vui lòng nhập lý do từ chối',
  }, // BR-18
  NO_ACTIVE_VEHICLE: {
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Bạn chưa có phương tiện được duyệt',
  }, // BR-26
  LOCATION_REQUIRED: {
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Vui lòng bật định vị để nhận chuyến',
  }, // BR-26
  WALLET_BELOW_THRESHOLD: {
    httpStatus: HttpStatus.FORBIDDEN,
    message: 'Ví của bạn đang âm vượt mức cho phép',
  }, // BR-67
  ACTIVE_RIDE_EXISTS: {
    httpStatus: HttpStatus.CONFLICT,
    message: 'Bạn đang có chuyến chưa hoàn thành',
  }, // BR-30
  RIDE_ALREADY_TAKEN: {
    httpStatus: HttpStatus.CONFLICT,
    message: 'Chuyến đã có tài xế khác nhận',
  }, // BR-45
  INVALID_STATE_TRANSITION: {
    httpStatus: HttpStatus.CONFLICT,
    message: 'Không thể chuyển sang trạng thái này',
  }, // BR-31
  NOT_RIDE_OWNER: {
    httpStatus: HttpStatus.FORBIDDEN,
    message: 'Bạn không phải tài xế của chuyến này',
  }, // BR-32
  CANNOT_CANCEL_IN_PROGRESS: {
    httpStatus: HttpStatus.CONFLICT,
    message: 'Không thể hủy chuyến đang chở khách',
  }, // BR-49
  CANCEL_REASON_REQUIRED: {
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Vui lòng nhập lý do hủy chuyến',
  }, // BR-50
  OFFER_EXPIRED: {
    httpStatus: HttpStatus.CONFLICT,
    message: 'Lời mời đã hết hạn',
  }, // BR-42
  TOPUP_REQUEST_PENDING: {
    httpStatus: HttpStatus.CONFLICT,
    message: 'Bạn đang có yêu cầu nạp tiền chờ duyệt',
  }, // BR-70
  TOPUP_AMOUNT_INVALID: {
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Số tiền nạp không hợp lệ',
  }, // BR-69
  FARE_OUT_OF_RANGE: {
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'Giá chuyến nằm ngoài khoảng cho phép',
  }, // BR-37
  CUSTOMER_HAS_RIDES: {
    httpStatus: HttpStatus.CONFLICT,
    message: 'Khách hàng đã gắn chuyến, không thể xóa',
  }, // API.md mục 6 (#34) — chưa có mã BR riêng trong BUSINESS-RULES.md

  // Không thuộc bảng mục 14 (không phải lỗi nghiệp vụ) — dùng riêng bởi
  // AllExceptionsFilter cho mọi lỗi không xác định (ARCHITECTURE.md mục 3.3).
  INTERNAL_ERROR: {
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau',
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
