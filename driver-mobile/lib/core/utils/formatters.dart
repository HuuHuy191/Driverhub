import 'package:intl/intl.dart';

class Formatters {
  const Formatters._();

  static final NumberFormat _currency = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: '₫',
    decimalDigits: 0,
  );

  static String currency(num amount) => _currency.format(amount);

  static String distance(double distanceKm) {
    if (distanceKm < 1) return '${(distanceKm * 1000).round()} m';
    return '${distanceKm.toStringAsFixed(1)} km';
  }

  static DateTime toVietnamTime(DateTime serverTime) =>
      serverTime.toUtc().add(const Duration(hours: 7));

  static String serverTime(
    String utcValue, {
    String pattern = 'dd/MM/yyyy HH:mm',
  }) {
    final parsed = DateTime.parse(utcValue);
    return DateFormat(pattern, 'vi_VN').format(toVietnamTime(parsed));
  }
}
