import 'package:dio/dio.dart';

class AppException implements Exception {
  const AppException({required this.message, this.errorCode, this.statusCode});

  final String message;
  final String? errorCode;
  final int? statusCode;

  factory AppException.from(Object error) {
    if (error is AppException) return error;
    if (error is DioException) return AppException.fromDioException(error);
    return const AppException(message: 'Đã xảy ra lỗi. Vui lòng thử lại.');
  }

  factory AppException.fromDioException(DioException error) {
    if (error.error case final AppException nested) return nested;

    final responseData = error.response?.data;
    final body = responseData is Map
        ? Map<String, dynamic>.from(responseData)
        : const <String, dynamic>{};
    final errorCode = body['errorCode'] as String?;

    // API 1.4: client maps errorCode, never parses the server message.
    if (errorCode != null) {
      return AppException(
        message: _messages[errorCode] ?? 'Đã xảy ra lỗi. Vui lòng thử lại.',
        errorCode: errorCode,
        statusCode: error.response?.statusCode,
      );
    }

    return AppException(
      message: _networkMessage(error.type),
      statusCode: error.response?.statusCode,
    );
  }

  static String _networkMessage(DioExceptionType type) => switch (type) {
    DioExceptionType.connectionTimeout ||
    DioExceptionType.sendTimeout ||
    DioExceptionType.receiveTimeout =>
      'Kết nối quá thời gian. Vui lòng thử lại.',
    DioExceptionType.connectionError => 'Không thể kết nối đến máy chủ.',
    _ => 'Đã xảy ra lỗi. Vui lòng thử lại.',
  };

  static const Map<String, String> _messages = {
    'INVALID_CREDENTIALS': 'Email hoặc mật khẩu không đúng',
    'CURRENT_PASSWORD_INVALID': 'Mật khẩu hiện tại không đúng',
    'ACCOUNT_LOCKED': 'Tài khoản đã bị khóa',
    'ACCOUNT_NOT_APPROVED': 'Hồ sơ của bạn đang chờ duyệt',
    'EMAIL_ALREADY_EXISTS': 'Email đã được sử dụng',
    'PHONE_ALREADY_EXISTS': 'Số điện thoại đã được sử dụng',
    'LICENSE_PLATE_EXISTS': 'Biển số xe đã tồn tại',
    'IDENTITY_INFORMATION_INCOMPLETE': 'Vui lòng bổ sung thông tin định danh',
    'REJECT_REASON_REQUIRED': 'Vui lòng nhập lý do từ chối',
    'NO_ACTIVE_VEHICLE': 'Bạn chưa có phương tiện được duyệt',
    'LOCATION_REQUIRED': 'Vui lòng bật định vị để nhận chuyến',
    'WALLET_BELOW_THRESHOLD': 'Ví của bạn đang âm vượt mức cho phép',
    'ACTIVE_RIDE_EXISTS': 'Bạn đang có chuyến chưa hoàn thành',
    'RIDE_ALREADY_TAKEN': 'Chuyến đã có tài xế khác nhận',
    'INVALID_STATE_TRANSITION': 'Không thể chuyển sang trạng thái này',
    'NOT_RIDE_OWNER': 'Bạn không phải tài xế của chuyến này',
    'CANNOT_CANCEL_IN_PROGRESS': 'Không thể hủy chuyến đang chở khách',
    'CANCEL_REASON_REQUIRED': 'Vui lòng nhập lý do hủy chuyến',
    'OFFER_EXPIRED': 'Lời mời đã hết hạn',
    'TOPUP_REQUEST_PENDING': 'Bạn đang có yêu cầu nạp tiền chờ duyệt',
    'TOPUP_AMOUNT_INVALID': 'Số tiền nạp không hợp lệ',
    'FARE_OUT_OF_RANGE': 'Giá chuyến nằm ngoài khoảng cho phép',
  };

  @override
  String toString() => message;
}
