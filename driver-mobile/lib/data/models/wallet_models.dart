class WalletModel {
  const WalletModel({
    required this.balance,
    required this.maxNegativeBalance,
    required this.availableMargin,
    required this.isBlocked,
    required this.updatedAt,
    this.warningMessage,
  });

  final int balance;
  final int maxNegativeBalance;
  final int availableMargin;
  final bool isBlocked;
  final String? warningMessage;
  final DateTime updatedAt;

  factory WalletModel.fromJson(Map<String, dynamic> json) => WalletModel(
    balance: (json['balance'] as num).toInt(),
    maxNegativeBalance: (json['maxNegativeBalance'] as num).toInt(),
    availableMargin: (json['availableMargin'] as num).toInt(),
    isBlocked: json['isBlocked'] as bool,
    warningMessage: json['warningMessage'] as String?,
    updatedAt: DateTime.parse(json['updatedAt'] as String).toUtc(),
  );
}

class WalletTransactionModel {
  const WalletTransactionModel({
    required this.id,
    required this.type,
    required this.typeLabel,
    required this.direction,
    required this.amount,
    required this.balanceAfter,
    required this.description,
    required this.createdAt,
    this.ride,
  });

  final String id;
  final String type;
  final String typeLabel;
  final String direction;
  final int amount;
  final int balanceAfter;
  final String description;
  final DateTime createdAt;
  final WalletRideModel? ride;

  factory WalletTransactionModel.fromJson(Map<String, dynamic> json) =>
      WalletTransactionModel(
        id: json['id'] as String,
        type: json['type'] as String,
        typeLabel: json['typeLabel'] as String,
        direction: json['direction'] as String,
        amount: (json['amount'] as num).toInt(),
        balanceAfter: (json['balanceAfter'] as num).toInt(),
        description: json['description'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String).toUtc(),
        ride: json['ride'] is Map
            ? WalletRideModel.fromJson(
                Map<String, dynamic>.from(json['ride'] as Map),
              )
            : null,
      );
}

class WalletRideModel {
  const WalletRideModel({
    required this.id,
    required this.rideCode,
    required this.finalFare,
  });

  final String id;
  final String rideCode;
  final int finalFare;

  factory WalletRideModel.fromJson(Map<String, dynamic> json) =>
      WalletRideModel(
        id: json['id'] as String,
        rideCode: json['rideCode'] as String,
        finalFare: (json['finalFare'] as num).toInt(),
      );
}

class TopupRequestModel {
  const TopupRequestModel({
    required this.id,
    required this.amount,
    required this.status,
    required this.createdAt,
    this.receiptUrl,
    this.rejectReason,
  });

  final String id;
  final int amount;
  final String status;
  final DateTime createdAt;
  final String? receiptUrl;
  final String? rejectReason;

  factory TopupRequestModel.fromJson(Map<String, dynamic> json) =>
      TopupRequestModel(
        id: json['id'] as String,
        amount: (json['amount'] as num).toInt(),
        status: json['status'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String).toUtc(),
        receiptUrl: json['receiptUrl'] as String?,
        rejectReason: json['rejectReason'] as String?,
      );
}
