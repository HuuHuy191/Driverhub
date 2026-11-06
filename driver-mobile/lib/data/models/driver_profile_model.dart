class DriverProfileModel {
  const DriverProfileModel({
    required this.id,
    required this.fullName,
    required this.phoneNumber,
    required this.email,
    required this.approvalStatus,
    required this.isOnline,
    required this.vehicles,
    this.dateOfBirth,
    this.citizenIdNumber,
    this.citizenIdIssueDate,
    this.driverLicenseNumber,
    this.driverLicenseIssueDate,
    this.temporaryAddress,
    this.avatarUrl,
    this.rejectReason,
  });

  final String id;
  final String fullName;
  final String phoneNumber;
  final String email;
  final String approvalStatus;
  final bool isOnline;
  final String? dateOfBirth;
  final String? citizenIdNumber;
  final String? citizenIdIssueDate;
  final String? driverLicenseNumber;
  final String? driverLicenseIssueDate;
  final String? temporaryAddress;
  final String? avatarUrl;
  final String? rejectReason;
  final List<DriverVehicleModel> vehicles;

  factory DriverProfileModel.fromJson(Map<String, dynamic> json) =>
      DriverProfileModel(
        id: json['id'] as String,
        fullName: json['fullName'] as String,
        phoneNumber: json['phoneNumber'] as String,
        email: json['email'] as String,
        approvalStatus: json['approvalStatus'] as String,
        isOnline: json['isOnline'] as bool,
        dateOfBirth: json['dateOfBirth'] as String?,
        citizenIdNumber: json['citizenIdNumber'] as String?,
        citizenIdIssueDate: json['citizenIdIssueDate'] as String?,
        driverLicenseNumber: json['driverLicenseNumber'] as String?,
        driverLicenseIssueDate: json['driverLicenseIssueDate'] as String?,
        temporaryAddress: json['temporaryAddress'] as String?,
        avatarUrl: json['avatarUrl'] as String?,
        rejectReason: json['rejectReason'] as String?,
        vehicles: (json['vehicles'] as List<dynamic>? ?? const [])
            .map(
              (vehicle) => DriverVehicleModel.fromJson(
                Map<String, dynamic>.from(vehicle as Map),
              ),
            )
            .toList(growable: false),
      );
}

class DriverVehicleModel {
  const DriverVehicleModel({
    required this.id,
    required this.vehicleType,
    required this.brand,
    required this.modelName,
    required this.licensePlate,
    required this.isActive,
    required this.verificationStatus,
    this.color,
  });

  final String id;
  final String vehicleType;
  final String brand;
  final String modelName;
  final String licensePlate;
  final String verificationStatus;
  final bool isActive;
  final String? color;

  factory DriverVehicleModel.fromJson(Map<String, dynamic> json) =>
      DriverVehicleModel(
        id: json['id'] as String,
        vehicleType: json['vehicleType'] as String,
        brand: json['brand'] as String,
        modelName: json['modelName'] as String,
        licensePlate: json['licensePlate'] as String,
        isActive: json['isActive'] as bool,
        verificationStatus: json['verificationStatus'] as String,
        color: json['color'] as String?,
      );
}
