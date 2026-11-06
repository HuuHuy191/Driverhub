import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/errors/app_exception.dart';
import '../../data/models/notification_model.dart';
import '../../data/repositories/notification_repository.dart';
import '../../services/driver_realtime_service.dart';

class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  final List<NotificationModel> _notifications = [];
  int _page = 1;
  int _totalPages = 1;
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;
  StreamSubscription<DriverRealtimeEvent>? _eventSubscription;

  @override
  void initState() {
    super.initState();
    _eventSubscription = ref
        .read(driverRealtimeServiceProvider)
        .events
        .where((event) => event.name == 'notification:new')
        .listen((_) => _load());
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _eventSubscription?.cancel();
    super.dispose();
  }

  Future<void> _load({bool loadMore = false}) async {
    if (loadMore && (_loadingMore || _page >= _totalPages)) return;
    setState(() {
      _error = null;
      if (loadMore) {
        _loadingMore = true;
      } else {
        _loading = true;
      }
    });

    final nextPage = loadMore ? _page + 1 : 1;
    try {
      final result = await ref
          .read(notificationRepositoryProvider)
          .list(page: nextPage);
      if (!mounted) return;
      setState(() {
        if (loadMore) {
          _notifications.addAll(result.notifications);
        } else {
          _notifications
            ..clear()
            ..addAll(result.notifications);
        }
        _page = nextPage;
        _totalPages = result.totalPages;
        _loading = false;
        _loadingMore = false;
      });
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        _error = AppException.from(error).message;
        _loading = false;
        _loadingMore = false;
      });
    }
  }

  Future<void> _markRead(NotificationModel notification) async {
    if (notification.isRead) return;
    try {
      await ref.read(notificationRepositoryProvider).markRead(notification.id);
      if (!mounted) return;
      _updateReadState(notification.id);
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
    }
  }

  Future<void> _markAllRead() async {
    if (!_notifications.any((notification) => !notification.isRead)) return;
    try {
      await ref.read(notificationRepositoryProvider).markAllRead();
      if (!mounted) return;
      setState(() {
        for (var index = 0; index < _notifications.length; index++) {
          _notifications[index] = _notifications[index].copyWith(isRead: true);
        }
      });
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
    }
  }

  void _updateReadState(String id) {
    final index = _notifications.indexWhere(
      (notification) => notification.id == id,
    );
    if (index < 0) return;
    setState(() {
      _notifications[index] = _notifications[index].copyWith(isRead: true);
    });
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Thông báo'),
      actions: [
        TextButton(
          onPressed: _loading ? null : _markAllRead,
          child: const Text('Đọc tất cả'),
        ),
      ],
    ),
    body: _loading && _notifications.isEmpty
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                if (_error != null)
                  ListTile(
                    leading: const Icon(Icons.error_outline),
                    title: Text(_error!),
                    trailing: IconButton(
                      tooltip: 'Tải lại',
                      onPressed: _load,
                      icon: const Icon(Icons.refresh),
                    ),
                  ),
                if (_notifications.isEmpty && _error == null)
                  const Padding(
                    padding: EdgeInsets.all(32),
                    child: Column(
                      children: [
                        Icon(Icons.notifications_none, size: 48),
                        SizedBox(height: 12),
                        Text('Bạn chưa có thông báo nào.'),
                      ],
                    ),
                  ),
                ..._notifications.map(
                  (notification) => _NotificationTile(
                    notification: notification,
                    onTap: () => _markRead(notification),
                  ),
                ),
                if (_page < _totalPages)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Center(
                      child: _loadingMore
                          ? const CircularProgressIndicator()
                          : OutlinedButton(
                              onPressed: () => _load(loadMore: true),
                              child: const Text('Tải thêm'),
                            ),
                    ),
                  ),
              ],
            ),
          ),
  );
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.notification,
    required this.onTap,
  });

  final NotificationModel notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return ListTile(
      leading: Icon(
        notification.isRead
            ? Icons.notifications_none
            : Icons.notifications_active_outlined,
        color: notification.isRead ? null : colorScheme.primary,
      ),
      title: Text(
        notification.title,
        style: TextStyle(
          fontWeight: notification.isRead ? FontWeight.normal : FontWeight.bold,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(notification.body),
          const SizedBox(height: 4),
          Text(
            DateFormat(
              'dd/MM/yyyy HH:mm',
            ).format(notification.createdAt.toLocal()),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
      onTap: onTap,
    );
  }
}
