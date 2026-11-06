import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_controller.dart';
import '../../services/driver_realtime_service.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Đăng xuất'),
        content: const Text('Bạn có chắc muốn đăng xuất khỏi thiết bị này?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    ref.read(driverRealtimeServiceProvider).disconnect();
    await ref.read(authControllerProvider.notifier).logout();
    if (!context.mounted) return;
    final error = ref.read(authControllerProvider).error;
    if (error != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    }
    context.go('/');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(title: const Text('Cài đặt')),
    body: ListView(
      children: [
        ListTile(
          leading: const Icon(Icons.person_outline),
          title: const Text('Hồ sơ cá nhân'),
          onTap: () => context.push('/profile'),
        ),
        ListTile(
          leading: const Icon(Icons.receipt_long_outlined),
          title: const Text('Lịch sử chuyến'),
          onTap: () => context.push('/rides'),
        ),
        ListTile(
          leading: const Icon(Icons.account_balance_wallet_outlined),
          title: const Text('Ví và giao dịch'),
          onTap: () => context.push('/wallet'),
        ),
        ListTile(
          leading: const Icon(Icons.bar_chart_outlined),
          title: const Text('Thống kê thu nhập'),
          onTap: () => context.push('/statistics'),
        ),
        ListTile(
          leading: const Icon(Icons.notifications_outlined),
          title: const Text('Thông báo'),
          onTap: () => context.push('/notifications'),
        ),
        const Divider(),
        ListTile(
          leading: const Icon(Icons.lock_outline),
          title: const Text('Đổi mật khẩu'),
          onTap: () => context.push('/settings/change-password'),
        ),
        ListTile(
          leading: const Icon(Icons.info_outline),
          title: const Text('Thông tin ứng dụng'),
          onTap: () => showAboutDialog(
            context: context,
            applicationName: 'DriverHub',
            applicationLegalese:
                'Ứng dụng điều phối chuyến xe mô phỏng dành cho tài xế.',
          ),
        ),
        const Divider(),
        ListTile(
          leading: const Icon(Icons.logout),
          title: const Text('Đăng xuất'),
          onTap: () => _logout(context, ref),
        ),
      ],
    ),
  );
}
