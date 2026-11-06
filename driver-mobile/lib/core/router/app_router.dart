import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/auth_gate.dart';
import '../../features/auth/presentation/registration_flow.dart';
import '../../features/rides/ride_history_page.dart';
import '../../features/rides/ride_page.dart';
import '../../features/profile/profile_page.dart';
import '../../features/notifications/notifications_page.dart';
import '../../features/settings/change_password_page.dart';
import '../../features/settings/settings_page.dart';
import '../../features/statistics/statistics_page.dart';
import '../../features/wallet/wallet_pages.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    routes: [
      GoRoute(path: '/', builder: (context, state) => const AuthGate()),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegistrationFlowScreen(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfilePage(),
      ),
      GoRoute(path: '/ride', builder: (context, state) => const RidePage()),
      GoRoute(
        path: '/rides',
        builder: (context, state) => const RideHistoryPage(),
      ),
      GoRoute(
        path: '/rides/:rideId',
        builder: (context, state) =>
            RideDetailsPage(rideId: state.pathParameters['rideId']!),
      ),
      GoRoute(path: '/wallet', builder: (context, state) => const WalletPage()),
      GoRoute(
        path: '/transactions',
        builder: (context, state) => const WalletTransactionsPage(),
      ),
      GoRoute(path: '/top-up', builder: (context, state) => const TopupPage()),
      GoRoute(
        path: '/statistics',
        builder: (context, state) => const StatisticsPage(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsPage(),
      ),
      GoRoute(
        path: '/settings/change-password',
        builder: (context, state) => const ChangePasswordPage(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsPage(),
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
