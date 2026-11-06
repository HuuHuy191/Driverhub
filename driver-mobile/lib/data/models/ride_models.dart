class RideOfferModel {
  const RideOfferModel({
    required this.offerId,
    required this.rideId,
    required this.rideCode,
    required this.customerName,
    required this.pickupAddress,
    required this.pickupLatitude,
    required this.pickupLongitude,
    required this.dropoffAddress,
    required this.dropoffLatitude,
    required this.dropoffLongitude,
    required this.distanceKm,
    required this.distanceToPickupKm,
    required this.estimatedFare,
    required this.estimatedEarning,
    required this.paymentMethod,
    required this.expiredAt,
    required this.remainingSeconds,
  });

  final String offerId;
  final String rideId;
  final String rideCode;
  final String customerName;
  final String pickupAddress;
  final double pickupLatitude;
  final double pickupLongitude;
  final String dropoffAddress;
  final double dropoffLatitude;
  final double dropoffLongitude;
  final double distanceKm;
  final double? distanceToPickupKm;
  final int estimatedFare;
  final int estimatedEarning;
  final String paymentMethod;
  final DateTime expiredAt;
  final int remainingSeconds;

  factory RideOfferModel.fromJson(Map<String, dynamic> json) => RideOfferModel(
    offerId: json['offerId'] as String,
    rideId: json['rideId'] as String,
    rideCode: json['rideCode'] as String,
    customerName: json['customerName'] as String,
    pickupAddress: json['pickupAddress'] as String,
    pickupLatitude: (json['pickupLatitude'] as num).toDouble(),
    pickupLongitude: (json['pickupLongitude'] as num).toDouble(),
    dropoffAddress: json['dropoffAddress'] as String,
    dropoffLatitude: (json['dropoffLatitude'] as num).toDouble(),
    dropoffLongitude: (json['dropoffLongitude'] as num).toDouble(),
    distanceKm: (json['distanceKm'] as num).toDouble(),
    distanceToPickupKm: (json['distanceToPickupKm'] as num?)?.toDouble(),
    estimatedFare: (json['estimatedFare'] as num).toInt(),
    estimatedEarning: (json['estimatedEarning'] as num).toInt(),
    paymentMethod: json['paymentMethod'] as String,
    expiredAt: DateTime.parse(json['expiredAt'] as String).toUtc(),
    remainingSeconds: (json['remainingSeconds'] as num).toInt(),
  );
}

class ActiveRideModel {
  const ActiveRideModel({
    required this.id,
    required this.rideCode,
    required this.status,
    required this.pickupAddress,
    required this.pickupLatitude,
    required this.pickupLongitude,
    required this.dropoffAddress,
    required this.dropoffLatitude,
    required this.dropoffLongitude,
    required this.distanceKm,
    required this.estimatedFare,
    required this.paymentMethod,
    this.acceptedAt,
    this.arrivedAt,
    this.startedAt,
    this.completedAt,
    this.cancelledAt,
    this.finalFare,
    this.platformFee,
    this.driverEarning,
    this.cancelReason,
    this.customer,
    this.vehicle,
  });

  final String id;
  final String rideCode;
  final String status;
  final String pickupAddress;
  final double pickupLatitude;
  final double pickupLongitude;
  final String dropoffAddress;
  final double dropoffLatitude;
  final double dropoffLongitude;
  final double distanceKm;
  final int estimatedFare;
  final String paymentMethod;
  final DateTime? acceptedAt;
  final DateTime? arrivedAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final DateTime? cancelledAt;
  final int? finalFare;
  final int? platformFee;
  final int? driverEarning;
  final String? cancelReason;
  final RideCustomerModel? customer;
  final RideVehicleModel? vehicle;

  factory ActiveRideModel.fromJson(Map<String, dynamic> json) =>
      ActiveRideModel(
        id: json['id'] as String,
        rideCode: json['rideCode'] as String,
        status: json['status'] as String,
        pickupAddress: json['pickupAddress'] as String,
        pickupLatitude: (json['pickupLatitude'] as num).toDouble(),
        pickupLongitude: (json['pickupLongitude'] as num).toDouble(),
        dropoffAddress: json['dropoffAddress'] as String,
        dropoffLatitude: (json['dropoffLatitude'] as num).toDouble(),
        dropoffLongitude: (json['dropoffLongitude'] as num).toDouble(),
        distanceKm: (json['distanceKm'] as num).toDouble(),
        estimatedFare: (json['estimatedFare'] as num).toInt(),
        paymentMethod: json['paymentMethod'] as String,
        acceptedAt: json['acceptedAt'] == null
            ? null
            : DateTime.parse(json['acceptedAt'] as String).toUtc(),
        arrivedAt: json['arrivedAt'] == null
            ? null
            : DateTime.parse(json['arrivedAt'] as String).toUtc(),
        startedAt: json['startedAt'] == null
            ? null
            : DateTime.parse(json['startedAt'] as String).toUtc(),
        completedAt: json['completedAt'] == null
            ? null
            : DateTime.parse(json['completedAt'] as String).toUtc(),
        cancelledAt: json['cancelledAt'] == null
            ? null
            : DateTime.parse(json['cancelledAt'] as String).toUtc(),
        finalFare: (json['finalFare'] as num?)?.toInt(),
        platformFee: (json['platformFee'] as num?)?.toInt(),
        driverEarning: (json['driverEarning'] as num?)?.toInt(),
        cancelReason: json['cancelReason'] as String?,
        customer: json['customer'] is Map
            ? RideCustomerModel.fromJson(
                Map<String, dynamic>.from(json['customer'] as Map),
              )
            : null,
        vehicle: json['vehicle'] is Map
            ? RideVehicleModel.fromJson(
                Map<String, dynamic>.from(json['vehicle'] as Map),
              )
            : null,
      );
}

class RideHistoryEventModel {
  const RideHistoryEventModel({
    required this.fromStatus,
    required this.toStatus,
    required this.changedByType,
    required this.changedAt,
    this.note,
  });

  final String? fromStatus;
  final String toStatus;
  final String changedByType;
  final DateTime changedAt;
  final String? note;

  factory RideHistoryEventModel.fromJson(Map<String, dynamic> json) =>
      RideHistoryEventModel(
        fromStatus: json['fromStatus'] as String?,
        toStatus: json['toStatus'] as String,
        changedByType: json['changedByType'] as String,
        changedAt: DateTime.parse(json['changedAt'] as String).toUtc(),
        note: json['note'] as String?,
      );
}

class RideCustomerModel {
  const RideCustomerModel({required this.fullName, required this.phoneNumber});

  final String fullName;
  final String phoneNumber;

  factory RideCustomerModel.fromJson(Map<String, dynamic> json) =>
      RideCustomerModel(
        fullName: json['fullName'] as String,
        phoneNumber: json['phoneNumber'] as String,
      );
}

class RideVehicleModel {
  const RideVehicleModel({
    required this.licensePlate,
    required this.brand,
    required this.modelName,
  });

  final String licensePlate;
  final String brand;
  final String modelName;

  factory RideVehicleModel.fromJson(Map<String, dynamic> json) =>
      RideVehicleModel(
        licensePlate: json['licensePlate'] as String,
        brand: json['brand'] as String,
        modelName: json['modelName'] as String,
      );
}
