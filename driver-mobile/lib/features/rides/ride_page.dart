import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/errors/app_exception.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/ride_models.dart';
import '../../data/repositories/ride_repository.dart';
import '../../services/access_token_store.dart';
import '../../services/driver_realtime_service.dart';

class RidePage extends ConsumerStatefulWidget {
  const RidePage({super.key});

  @override
  ConsumerState<RidePage> createState() => _RidePageState();
}

class _RidePageState extends ConsumerState<RidePage> {
  ActiveRideModel? _ride;
  bool _loading = true;
  bool _updating = false;
  Timer? _refreshTimer;
  Timer? _locationTimer;
  bool _locationErrorShown = false;
  StreamSubscription<DriverRealtimeEvent>? _eventSubscription;

  @override
  void initState() {
    super.initState();
    _eventSubscription = ref.read(driverRealtimeServiceProvider).events.listen((
      event,
    ) {
      if (event.name == 'ride:cancelled') _load();
    });
    final token = ref.read(accessTokenStoreProvider).token;
    if (token != null && token.isNotEmpty) {
      ref.read(driverRealtimeServiceProvider).connect(token);
      _locationTimer = Timer.periodic(
        const Duration(seconds: 30),
        (_) => _sendLocation(),
      );
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
    _refreshTimer = Timer.periodic(const Duration(seconds: 20), (_) => _load());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _locationTimer?.cancel();
    _eventSubscription?.cancel();
    super.dispose();
  }

  Future<void> _sendLocation() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (!_locationErrorShown) {
          _locationErrorShown = true;
          _showMessage('Cần quyền vị trí để cập nhật vị trí trong chuyến.');
        }
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      ref
          .read(driverRealtimeServiceProvider)
          .sendLocation(
            latitude: position.latitude,
            longitude: position.longitude,
            heading: position.heading,
            speed: position.speed,
          );
    } on Object catch (error) {
      if (!_locationErrorShown) {
        _locationErrorShown = true;
        _showMessage(AppException.from(error).message);
      }
    }
  }

  Future<void> _load() async {
    try {
      final ride = await ref.read(rideRepositoryProvider).getActiveRide();
      if (!mounted) return;
      if (ride == null) {
        context.go('/');
        return;
      }
      setState(() {
        _ride = ride;
        _loading = false;
      });
    } on Object catch (error) {
      if (!mounted) return;
      setState(() => _loading = false);
      _showMessage(AppException.from(error).message);
    }
  }

  Future<void> _advanceRide() async {
    final ride = _ride;
    if (ride == null || _updating) return;
    final nextStatus = switch (ride.status) {
      'ACCEPTED' => 'ARRIVED',
      'ARRIVED' => 'IN_PROGRESS',
      'IN_PROGRESS' => 'COMPLETED',
      _ => null,
    };
    if (nextStatus == null) return;

    setState(() => _updating = true);
    try {
      final result = await ref
          .read(rideRepositoryProvider)
          .updateStatus(ride.id, nextStatus);
      if (!mounted) return;
      if (nextStatus == 'COMPLETED') {
        await _showSettlement(result['settlement']);
        if (mounted) context.go('/');
      } else {
        await _load();
      }
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  Future<void> _cancelRide() async {
    final ride = _ride;
    if (ride == null || _updating || ride.status == 'IN_PROGRESS') return;
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => const _CancelRideDialog(),
    );
    if (reason == null || !mounted) return;
    setState(() => _updating = true);
    try {
      await ref.read(rideRepositoryProvider).cancelRide(ride.id, reason);
      if (mounted) context.go('/');
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  Future<void> _callCustomer() async {
    final phone = _ride?.customer?.phoneNumber;
    if (phone == null || phone.isEmpty) return;
    final launched = await launchUrl(Uri(scheme: 'tel', path: phone));
    if (!launched && mounted) {
      _showMessage('Thiết bị không thể thực hiện cuộc gọi.');
    }
  }

  Future<void> _showSettlement(Object? value) async {
    if (value is! Map) {
      _showMessage('Chuyến đã hoàn thành.');
      return;
    }
    final settlement = Map<String, dynamic>.from(value);
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hoàn thành chuyến'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _amountLine('Cước chuyến', settlement['finalFare']),
            _amountLine('Phí nền tảng', settlement['platformFee']),
            _amountLine('Thu nhập tài xế', settlement['driverEarning']),
            const SizedBox(height: 8),
            Text(settlement['note'] as String? ?? ''),
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
  }

  Widget _amountLine(String label, Object? amount) {
    if (amount is! num) return Text('$label: —');
    return Text('$label: ${Formatters.currency(amount)}');
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final ride = _ride;
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (ride == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chuyến đang thực hiện')),
        body: Center(
          child: FilledButton(onPressed: _load, child: const Text('Tải lại')),
        ),
      );
    }
    final nextLabel = switch (ride.status) {
      'ACCEPTED' => 'Đã đến điểm đón',
      'ARRIVED' => 'Bắt đầu chuyến',
      'IN_PROGRESS' => 'Hoàn thành chuyến',
      _ => null,
    };
    return Scaffold(
      appBar: AppBar(title: Text('Chuyến ${ride.rideCode}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SizedBox(
            height: 260,
            child: Card(
              clipBehavior: Clip.antiAlias,
              child: FlutterMap(
                options: MapOptions(
                  initialCenter: LatLng(
                    ride.pickupLatitude,
                    ride.pickupLongitude,
                  ),
                  initialZoom: 13,
                ),
                children: [
                  TileLayer(
                    urlTemplate:
                        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.driverhub.driver_mobile',
                  ),
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: LatLng(
                          ride.pickupLatitude,
                          ride.pickupLongitude,
                        ),
                        width: 40,
                        height: 40,
                        child: const Icon(
                          Icons.location_on,
                          color: Colors.green,
                          size: 36,
                        ),
                      ),
                      Marker(
                        point: LatLng(
                          ride.dropoffLatitude,
                          ride.dropoffLongitude,
                        ),
                        width: 40,
                        height: 40,
                        child: const Icon(
                          Icons.flag,
                          color: Colors.red,
                          size: 32,
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
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Trạng thái: ${_rideStatus(ride.status)}'),
                  const Divider(),
                  Text('Đón: ${ride.pickupAddress}'),
                  const SizedBox(height: 8),
                  Text('Trả: ${ride.dropoffAddress}'),
                  const SizedBox(height: 8),
                  Text('Khoảng cách: ${Formatters.distance(ride.distanceKm)}'),
                  Text(
                    'Cước dự kiến: ${Formatters.currency(ride.estimatedFare)}',
                  ),
                  Text('Thanh toán: ${ride.paymentMethod}'),
                ],
              ),
            ),
          ),
          if (ride.customer case final customer?) ...[
            Card(
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.person)),
                title: Text(customer.fullName),
                subtitle: Text(customer.phoneNumber),
                trailing: IconButton(
                  tooltip: 'Gọi khách',
                  onPressed: _callCustomer,
                  icon: const Icon(Icons.call),
                ),
              ),
            ),
          ],
          if (nextLabel != null)
            FilledButton(
              onPressed: _updating ? null : _advanceRide,
              child: _updating
                  ? const CircularProgressIndicator()
                  : Text(nextLabel),
            ),
          if (ride.status == 'ACCEPTED' || ride.status == 'ARRIVED')
            OutlinedButton(
              onPressed: _updating ? null : _cancelRide,
              child: const Text('Hủy chuyến'),
            ),
        ],
      ),
    );
  }

  String _rideStatus(String status) => switch (status) {
    'ACCEPTED' => 'Đã nhận chuyến',
    'ARRIVED' => 'Đã đến điểm đón',
    'IN_PROGRESS' => 'Đang chở khách',
    'COMPLETED' => 'Đã hoàn thành',
    'CANCELLED' => 'Đã hủy',
    _ => status,
  };
}

class _CancelRideDialog extends StatefulWidget {
  const _CancelRideDialog();

  @override
  State<_CancelRideDialog> createState() => _CancelRideDialogState();
}

class _CancelRideDialogState extends State<_CancelRideDialog> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Hủy chuyến'),
    content: TextField(
      controller: _controller,
      minLines: 2,
      maxLines: 4,
      maxLength: 500,
      decoration: InputDecoration(
        labelText: 'Lý do hủy (tối thiểu 5 ký tự)',
        errorText: _error,
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Quay lại'),
      ),
      FilledButton(
        onPressed: () {
          final reason = _controller.text.trim();
          if (reason.length < 5) {
            setState(() => _error = 'Vui lòng nhập lý do hợp lệ');
            return;
          }
          Navigator.pop(context, reason);
        },
        child: const Text('Xác nhận hủy'),
      ),
    ],
  );
}
