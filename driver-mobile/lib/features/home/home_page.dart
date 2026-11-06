import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../core/errors/app_exception.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/driver_profile_model.dart';
import '../../data/models/driver_statistics.dart';
import '../../data/models/ride_models.dart';
import '../../data/models/wallet_models.dart';
import '../../data/repositories/driver_repository.dart';
import '../../data/repositories/ride_repository.dart';
import '../../data/repositories/wallet_repository.dart';
import '../../services/access_token_store.dart';
import '../../services/driver_realtime_service.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  DriverProfileModel? _profile;
  WalletModel? _wallet;
  DriverStatisticsModel? _stats;
  ActiveRideModel? _activeRide;
  Position? _position;
  bool _loading = true;
  bool _changingOnline = false;
  Timer? _locationTimer;
  Timer? _offerRefreshTimer;
  StreamSubscription<DriverRealtimeEvent>? _eventSubscription;
  StreamSubscription<bool>? _connectionSubscription;
  final Set<String> _visibleOfferIds = {};

  @override
  void initState() {
    super.initState();
    _eventSubscription = ref
        .read(driverRealtimeServiceProvider)
        .events
        .listen(_handleRealtimeEvent);
    _connectionSubscription = ref
        .read(driverRealtimeServiceProvider)
        .connectionStates
        .listen((connected) {
          if (!mounted ||
              connected ||
              _profile?.isOnline != true ||
              _changingOnline) {
            return;
          }
          _showMessage('Mất kết nối realtime; hệ thống sẽ tự kết nối lại.');
        });
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    _offerRefreshTimer?.cancel();
    _eventSubscription?.cancel();
    _connectionSubscription?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    DriverProfileModel profile;
    try {
      profile = await ref.read(driverRepositoryProvider).getProfile();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _loading = false;
      });
    } on Object catch (error) {
      if (!mounted) return;
      setState(() => _loading = false);
      _showMessage(AppException.from(error).message);
      return;
    }

    final today = DateTime.now();
    try {
      final wallet = await ref.read(walletRepositoryProvider).getWallet();
      if (mounted) setState(() => _wallet = wallet);
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
    }
    try {
      final stats = await ref
          .read(driverRepositoryProvider)
          .getStatistics(
            from: DateTime(today.year, today.month, today.day),
            to: today,
          );
      if (mounted) setState(() => _stats = stats);
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
    }
    try {
      final activeRide = await ref.read(rideRepositoryProvider).getActiveRide();
      if (mounted) setState(() => _activeRide = activeRide);
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
    }

    if (profile.isOnline) {
      try {
        await _startRealtime();
        _startPeriodicUpdates();
      } on Object catch (error) {
        _showMessage(AppException.from(error).message);
      }
    }
    if (_activeRide != null && mounted) {
      context.go('/ride');
    } else if (profile.isOnline) {
      await _refreshOffers();
    }
  }

  Future<void> _toggleOnline(bool online) async {
    if (_changingOnline) return;
    setState(() => _changingOnline = true);
    try {
      if (online) {
        _position = await _getCurrentPosition();
        await _startRealtime();
        // BR-26: send the current coordinates with the ONLINE transition.
        await ref
            .read(driverRepositoryProvider)
            .setOnlineStatus(
              isOnline: true,
              latitude: _position!.latitude,
              longitude: _position!.longitude,
            );
        if (mounted && _profile != null) {
          setState(() => _profile = _copyProfile(_profile!, isOnline: true));
        }
        _startPeriodicUpdates();
        await _refreshProfile();
        await _refreshOffers();
      } else {
        await ref
            .read(driverRepositoryProvider)
            .setOnlineStatus(isOnline: false);
        _locationTimer?.cancel();
        _offerRefreshTimer?.cancel();
        if (mounted && _profile != null) {
          setState(() => _profile = _copyProfile(_profile!, isOnline: false));
        }
        ref.read(driverRealtimeServiceProvider).disconnect();
        await _refreshProfile();
      }
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
    } finally {
      if (mounted) setState(() => _changingOnline = false);
    }
  }

  Future<void> _startRealtime() async {
    final token = ref.read(accessTokenStoreProvider).token;
    if (token == null || token.isEmpty) {
      throw const AppException(message: 'Phiên đăng nhập đã hết hạn.');
    }
    ref.read(driverRealtimeServiceProvider).connect(token);
  }

  void _startPeriodicUpdates() {
    _locationTimer?.cancel();
    _offerRefreshTimer?.cancel();
    _locationTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _sendLocation(),
    );
    _offerRefreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (_profile?.isOnline == true && _activeRide == null) {
        _refreshOffers();
      }
    });
  }

  Future<void> _sendLocation() async {
    if (_profile?.isOnline != true) return;
    try {
      final position = await _getCurrentPosition();
      if (!mounted || _profile?.isOnline != true) return;
      _position = position;
      ref
          .read(driverRealtimeServiceProvider)
          .sendLocation(
            latitude: position.latitude,
            longitude: position.longitude,
            heading: position.heading,
            speed: position.speed,
          );
      setState(() {});
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
    }
  }

  Future<Position> _getCurrentPosition() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const AppException(message: 'Vui lòng bật dịch vụ định vị.');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw const AppException(
        message: 'DriverHub cần quyền vị trí để bật trạng thái ONLINE.',
      );
    }
    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );
  }

  Future<void> _refreshProfile() async {
    final profile = await ref.read(driverRepositoryProvider).getProfile();
    if (mounted) setState(() => _profile = profile);
  }

  Future<void> _refreshOffers() async {
    if (_profile?.isOnline != true || _activeRide != null) return;
    try {
      final offers = await ref.read(rideRepositoryProvider).getOffers();
      if (!mounted) return;
      for (final offer in offers) {
        _presentOffer(offer);
      }
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
    }
  }

  void _handleRealtimeEvent(DriverRealtimeEvent event) {
    switch (event.name) {
      case 'ride:offer':
        _presentOffer(RideOfferModel.fromJson(event.data));
      case 'ride:offer_expired':
      case 'ride:offer_taken':
        _visibleOfferIds.remove(event.data['offerId'] as String?);
        break;
      case 'ride:assigned':
        _loadActiveRide();
        break;
      case 'ride:cancelled':
        _loadActiveRide();
        break;
      case 'wallet:updated':
        _loadWallet();
        break;
      case 'driver:force_offline':
        _locationTimer?.cancel();
        _offerRefreshTimer?.cancel();
        if (mounted) {
          setState(() {
            _profile = _profile == null
                ? null
                : _copyProfile(_profile!, isOnline: false);
          });
          ref.read(driverRealtimeServiceProvider).disconnect();
          _showMessage(
            event.data['reason'] as String? ??
                'Bạn đã bị chuyển sang trạng thái ngoại tuyến.',
          );
        }
    }
  }

  void _presentOffer(RideOfferModel offer) {
    if (!mounted || _visibleOfferIds.contains(offer.offerId)) return;
    _visibleOfferIds.add(offer.offerId);
    ref.read(driverRealtimeServiceProvider).markOfferViewed(offer.offerId);
    ref.read(rideRepositoryProvider).markViewed(offer.rideId).catchError((
      Object error,
    ) {
      if (mounted) _showMessage(AppException.from(error).message);
    });
    showDialog<RideOfferAction>(
      context: context,
      barrierDismissible: false,
      builder: (_) => RideOfferDialog(offer: offer),
    ).then((action) async {
      if (!mounted) return;
      _visibleOfferIds.remove(offer.offerId);
      if (action == RideOfferAction.accept) {
        try {
          final ride = await ref
              .read(rideRepositoryProvider)
              .acceptOffer(offer.rideId);
          if (!mounted) return;
          setState(() => _activeRide = ride);
          context.go('/ride');
        } on Object catch (error) {
          _showMessage(AppException.from(error).message);
          _refreshOffers();
        }
      } else if (action == RideOfferAction.ignore) {
        try {
          await ref.read(rideRepositoryProvider).ignoreOffer(offer.rideId);
        } on Object catch (error) {
          _showMessage(AppException.from(error).message);
        }
      }
    });
  }

  Future<void> _loadActiveRide() async {
    try {
      final ride = await ref.read(rideRepositoryProvider).getActiveRide();
      if (!mounted) return;
      setState(() => _activeRide = ride);
      if (ride != null) context.go('/ride');
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
    }
  }

  Future<void> _loadWallet() async {
    try {
      final wallet = await ref.read(walletRepositoryProvider).getWallet();
      if (mounted) setState(() => _wallet = wallet);
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  DriverProfileModel _copyProfile(
    DriverProfileModel profile, {
    required bool isOnline,
  }) => DriverProfileModel(
    id: profile.id,
    fullName: profile.fullName,
    phoneNumber: profile.phoneNumber,
    email: profile.email,
    approvalStatus: profile.approvalStatus,
    isOnline: isOnline,
    vehicles: profile.vehicles,
    dateOfBirth: profile.dateOfBirth,
    temporaryAddress: profile.temporaryAddress,
    avatarUrl: profile.avatarUrl,
    rejectReason: profile.rejectReason,
  );

  @override
  Widget build(BuildContext context) {
    final profile = _profile;
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (profile == null) {
      return Scaffold(
        body: Center(
          child: FilledButton(
            onPressed: _load,
            child: const Text('Tải lại trang chính'),
          ),
        ),
      );
    }

    final currentPoint = _position == null
        ? null
        : LatLng(_position!.latitude, _position!.longitude);
    return Scaffold(
      appBar: AppBar(
        title: const Text('DriverHub'),
        actions: [
          IconButton(
            tooltip: 'Thông báo',
            onPressed: () => context.push('/notifications'),
            icon: const Icon(Icons.notifications_outlined),
          ),
          IconButton(
            tooltip: 'Hồ sơ cá nhân',
            onPressed: () => context.push('/profile'),
            icon: const Icon(Icons.account_circle_outlined),
          ),
          IconButton(
            tooltip: 'Đăng xuất',
            onPressed: () => context.push('/settings'),
            icon: const Icon(Icons.settings_outlined),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Xin chào, ${profile.fullName}',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            profile.isOnline
                                ? 'Đang trực tuyến'
                                : 'Đang ngoại tuyến',
                          ),
                        ],
                      ),
                    ),
                    if (_changingOnline)
                      const CircularProgressIndicator()
                    else
                      Switch(value: profile.isOnline, onChanged: _toggleOnline),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 280,
              child: Card(
                clipBehavior: Clip.antiAlias,
                child: FlutterMap(
                  key: ValueKey(currentPoint),
                  options: MapOptions(
                    initialCenter:
                        currentPoint ?? const LatLng(21.0285, 105.8542),
                    initialZoom: 14,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.driverhub.driver_mobile',
                    ),
                    if (currentPoint != null)
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: currentPoint,
                            width: 44,
                            height: 44,
                            child: const Icon(
                              Icons.my_location,
                              color: Colors.teal,
                              size: 36,
                            ),
                          ),
                        ],
                      ),
                    const RichAttributionWidget(
                      attributions: [
                        TextSourceAttribution('OpenStreetMap contributors'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _SummaryCard(
                    title: 'Số dư ví',
                    value: _wallet == null
                        ? '—'
                        : Formatters.currency(_wallet!.balance),
                    icon: Icons.account_balance_wallet_outlined,
                    onTap: () => context.push('/wallet'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _SummaryCard(
                    title: 'Thu nhập hôm nay',
                    value: _stats == null
                        ? '—'
                        : Formatters.currency(_stats!.summary.netEarning),
                    icon: Icons.trending_up,
                    onTap: () => context.push('/statistics'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _SummaryCard(
                    title: 'Chuyến hoàn thành',
                    value: '${_stats?.summary.totalRides ?? 0}',
                    icon: Icons.local_taxi_outlined,
                    onTap: () => context.push('/rides'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _SummaryCard(
                    title: 'Giao dịch ví',
                    value: 'Xem lịch sử',
                    icon: Icons.receipt_long_outlined,
                    onTap: () => context.push('/transactions'),
                  ),
                ),
              ],
            ),
            if (_wallet?.isBlocked == true && _wallet?.warningMessage != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Card(
                  color: Theme.of(context).colorScheme.errorContainer,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(_wallet!.warningMessage!),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String value;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon),
            const SizedBox(height: 8),
            Text(title),
            const SizedBox(height: 4),
            Text(value, style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      ),
    ),
  );
}

enum RideOfferAction { accept, ignore, expired }

class RideOfferDialog extends StatefulWidget {
  const RideOfferDialog({required this.offer, super.key});

  final RideOfferModel offer;

  @override
  State<RideOfferDialog> createState() => _RideOfferDialogState();
}

class _RideOfferDialogState extends State<RideOfferDialog> {
  Timer? _timer;
  late int _secondsRemaining;

  @override
  void initState() {
    super.initState();
    _secondsRemaining = widget.offer.remainingSeconds;
    if (_secondsRemaining <= 0) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop(RideOfferAction.expired);
      });
      return;
    }
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_secondsRemaining <= 1) {
        _timer?.cancel();
        if (mounted) {
          Navigator.of(context).pop(RideOfferAction.expired);
        }
      } else if (mounted) {
        setState(() => _secondsRemaining--);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text('Chuyến ${widget.offer.rideCode}'),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Khách: ${widget.offer.customerName}'),
        const SizedBox(height: 8),
        Text('Đón: ${widget.offer.pickupAddress}'),
        Text('Trả: ${widget.offer.dropoffAddress}'),
        const SizedBox(height: 8),
        Text(
          'Cách điểm đón: ${widget.offer.distanceToPickupKm == null ? '—' : Formatters.distance(widget.offer.distanceToPickupKm!)}',
        ),
        Text(
          'Thu nhập dự kiến: ${Formatters.currency(widget.offer.estimatedEarning)}',
        ),
        const SizedBox(height: 8),
        Center(
          child: Text(
            '$_secondsRemaining giây',
            style: Theme.of(context).textTheme.titleLarge,
          ),
        ),
      ],
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.of(context).pop(RideOfferAction.ignore),
        child: const Text('Bỏ qua'),
      ),
      FilledButton(
        onPressed: _secondsRemaining == 0
            ? null
            : () => Navigator.of(context).pop(RideOfferAction.accept),
        child: const Text('Nhận chuyến'),
      ),
    ],
  );
}
