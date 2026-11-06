class UserModel {
  const UserModel({
    required this.id,
    required this.email,
    required this.role,
    required this.status,
  });

  final String id;
  final String email;
  final String role;
  final String status;

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
    id: json['id'] as String,
    email: json['email'] as String,
    role: json['role'] as String,
    status: json['status'] as String,
  );
}

class DriverSummaryModel {
  const DriverSummaryModel({
    required this.id,
    required this.fullName,
    required this.approvalStatus,
    required this.isOnline,
    this.avatarUrl,
    this.rejectReason,
  });

  final String id;
  final String fullName;
  final String approvalStatus;
  final bool isOnline;
  final String? avatarUrl;
  final String? rejectReason;

  factory DriverSummaryModel.fromJson(Map<String, dynamic> json) =>
      DriverSummaryModel(
        id: json['id'] as String,
        fullName: json['fullName'] as String,
        approvalStatus: json['approvalStatus'] as String,
        isOnline: json['isOnline'] as bool,
        avatarUrl: json['avatarUrl'] as String?,
        rejectReason: json['rejectReason'] as String?,
      );
}

class AuthSessionModel {
  const AuthSessionModel({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
    required this.user,
    required this.driver,
  });

  final String accessToken;
  final String refreshToken;
  final int expiresIn;
  final UserModel user;
  final DriverSummaryModel driver;

  factory AuthSessionModel.fromJson(Map<String, dynamic> json) =>
      AuthSessionModel(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
        expiresIn: (json['expiresIn'] as num).toInt(),
        user: UserModel.fromJson(
          Map<String, dynamic>.from(json['user'] as Map),
        ),
        driver: DriverSummaryModel.fromJson(
          Map<String, dynamic>.from(json['driver'] as Map),
        ),
      );
}

class AuthProfileModel {
  const AuthProfileModel({required this.user, required this.driver});

  final UserModel user;
  final DriverSummaryModel? driver;

  factory AuthProfileModel.fromJson(Map<String, dynamic> json) =>
      AuthProfileModel(
        user: UserModel.fromJson(
          Map<String, dynamic>.from(json['user'] as Map),
        ),
        driver: json['driver'] is Map
            ? DriverSummaryModel.fromJson(
                Map<String, dynamic>.from(json['driver'] as Map),
              )
            : null,
      );
}
