class DriverStatisticsModel {
  const DriverStatisticsModel({required this.summary, required this.breakdown});

  final DriverStatisticsSummary summary;
  final List<DriverStatisticsPoint> breakdown;

  factory DriverStatisticsModel.fromJson(Map<String, dynamic> json) {
    final points = json['breakdown'] as List<dynamic>? ?? const [];
    return DriverStatisticsModel(
      summary: DriverStatisticsSummary.fromJson(
        Map<String, dynamic>.from(json['summary'] as Map),
      ),
      breakdown: points
          .map(
            (item) => DriverStatisticsPoint.fromJson(
              Map<String, dynamic>.from(item as Map),
            ),
          )
          .toList(growable: false),
    );
  }
}

class DriverStatisticsSummary {
  const DriverStatisticsSummary({
    required this.totalRides,
    required this.totalFare,
    required this.totalPlatformFee,
    required this.netEarning,
    required this.cancelCount,
    required this.acceptanceRate,
  });

  final int totalRides;
  final int totalFare;
  final int totalPlatformFee;
  final int netEarning;
  final int cancelCount;
  final double acceptanceRate;

  factory DriverStatisticsSummary.fromJson(Map<String, dynamic> json) =>
      DriverStatisticsSummary(
        totalRides: (json['totalRides'] as num).toInt(),
        totalFare: (json['totalFare'] as num).toInt(),
        totalPlatformFee: (json['totalPlatformFee'] as num).toInt(),
        netEarning: (json['netEarning'] as num).toInt(),
        cancelCount: (json['cancelCount'] as num).toInt(),
        acceptanceRate: (json['acceptanceRate'] as num).toDouble(),
      );
}

class DriverStatisticsPoint {
  const DriverStatisticsPoint({
    required this.date,
    required this.rides,
    required this.fare,
    required this.platformFee,
    required this.netEarning,
  });

  final DateTime date;
  final int rides;
  final int fare;
  final int platformFee;
  final int netEarning;

  factory DriverStatisticsPoint.fromJson(Map<String, dynamic> json) =>
      DriverStatisticsPoint(
        date: DateTime.parse(json['date'] as String),
        rides: (json['rides'] as num).toInt(),
        fare: (json['fare'] as num).toInt(),
        platformFee: (json['platformFee'] as num).toInt(),
        netEarning: (json['netEarning'] as num).toInt(),
      );
}
