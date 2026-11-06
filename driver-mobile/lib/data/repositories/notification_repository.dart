import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/api_client.dart';
import '../models/notification_model.dart';

final notificationRepositoryProvider = Provider<NotificationRepository>(
  (ref) => NotificationRepository(ref.watch(apiClientProvider)),
);

class NotificationRepository {
  NotificationRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<({List<NotificationModel> notifications, int totalPages})> list({
    int page = 1,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/notifications',
      queryParameters: {'page': page, 'limit': 20},
    );
    final body = response.data!;
    return (
      notifications: (body['data'] as List<dynamic>)
          .map(
            (item) => NotificationModel.fromJson(
              Map<String, dynamic>.from(item as Map),
            ),
          )
          .toList(growable: false),
      totalPages: ((body['meta'] as Map)['totalPages'] as num).toInt(),
    );
  }

  Future<void> markRead(String id) async {
    await _apiClient.patch<Map<String, dynamic>>('/notifications/$id/read');
  }

  Future<void> markAllRead() async {
    await _apiClient.patch<Map<String, dynamic>>('/notifications/read-all');
  }
}
