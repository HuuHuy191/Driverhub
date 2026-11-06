import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/app_exception.dart';
import '../../services/api_client.dart';
import '../models/ride_models.dart';

final rideRepositoryProvider = Provider<RideRepository>(
  (ref) => RideRepository(ref.watch(apiClientProvider)),
);

class RideRepository {
  RideRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<RideOfferModel>> getOffers() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/rides/offers',
    );
    return (response.data!['data'] as List<dynamic>)
        .map(
          (item) =>
              RideOfferModel.fromJson(Map<String, dynamic>.from(item as Map)),
        )
        .toList(growable: false);
  }

  Future<void> markViewed(String rideId) async {
    await _apiClient.post<Map<String, dynamic>>('/rides/$rideId/view');
  }

  Future<void> ignoreOffer(String rideId) async {
    await _apiClient.post<Map<String, dynamic>>('/rides/$rideId/ignore');
  }

  Future<ActiveRideModel> acceptOffer(String rideId) async {
    await _apiClient.post<Map<String, dynamic>>('/rides/$rideId/accept');
    final activeRide = await getActiveRide();
    if (activeRide == null) {
      throw const AppException(
        message: 'Chuyến đã được nhận nhưng chưa tải được thông tin.',
      );
    }
    return activeRide;
  }

  Future<ActiveRideModel?> getActiveRide() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/rides/me/active',
    );
    final data = response.data!['data'];
    if (data == null) return null;
    return ActiveRideModel.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<Map<String, dynamic>> updateStatus(
    String rideId,
    String status,
  ) async {
    final response = await _apiClient.patch<Map<String, dynamic>>(
      '/rides/$rideId/status',
      data: {'status': status},
    );
    return Map<String, dynamic>.from(response.data!['data'] as Map);
  }

  Future<void> cancelRide(String rideId, String reason) async {
    await _apiClient.post<Map<String, dynamic>>(
      '/rides/$rideId/cancel',
      data: {'reason': reason},
    );
  }

  Future<({List<ActiveRideModel> rides, int totalPages})> getRideHistory({
    int page = 1,
    String? status,
    DateTime? from,
    DateTime? to,
  }) async {
    final fromQuery = from == null ? null : _dateQuery(from);
    final toQuery = to == null ? null : _dateQuery(to);
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/rides/me',
      queryParameters: {
        'page': page,
        'limit': 20,
        'status': ?status,
        'from': ?fromQuery,
        'to': ?toQuery,
      },
    );
    final body = response.data!;
    return (
      rides: (body['data'] as List<dynamic>)
          .map(
            (item) => ActiveRideModel.fromJson(
              Map<String, dynamic>.from(item as Map),
            ),
          )
          .toList(growable: false),
      totalPages: ((body['meta'] as Map)['totalPages'] as num).toInt(),
    );
  }

  Future<ActiveRideModel> getRide(String rideId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/rides/$rideId',
    );
    return ActiveRideModel.fromJson(
      Map<String, dynamic>.from(response.data!['data'] as Map),
    );
  }

  Future<List<RideHistoryEventModel>> getRideHistoryEvents(
    String rideId,
  ) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/rides/$rideId/history',
    );
    return (response.data!['data'] as List<dynamic>)
        .map(
          (item) => RideHistoryEventModel.fromJson(
            Map<String, dynamic>.from(item as Map),
          ),
        )
        .toList(growable: false);
  }

  String _dateQuery(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-'
      '${date.month.toString().padLeft(2, '0')}-'
      '${date.day.toString().padLeft(2, '0')}';
}
