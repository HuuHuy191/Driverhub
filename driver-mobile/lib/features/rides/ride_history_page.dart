import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../core/errors/app_exception.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/ride_models.dart';
import '../../data/repositories/ride_repository.dart';

class RideHistoryPage extends ConsumerStatefulWidget {
  const RideHistoryPage({super.key});

  @override
  ConsumerState<RideHistoryPage> createState() => _RideHistoryPageState();
}

class _RideHistoryPageState extends ConsumerState<RideHistoryPage> {
  List<ActiveRideModel> _rides = [];
  int _page = 1;
  int _totalPages = 1;
  String? _status;
  DateTime? _from;
  DateTime? _to;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load(reset: true));
  }

  Future<void> _load({required bool reset}) async {
    if (reset) {
      setState(() {
        _loading = true;
        _page = 1;
      });
    } else {
      setState(() => _loading = true);
    }
    try {
      final result = await ref
          .read(rideRepositoryProvider)
          .getRideHistory(
            page: reset ? 1 : _page,
            status: _status,
            from: _from,
            to: _to,
          );
      if (!mounted) return;
      setState(() {
        _rides = reset ? result.rides : [..._rides, ...result.rides];
        _totalPages = result.totalPages;
        _page = reset ? 1 : _page;
        _loading = false;
      });
    } on Object catch (error) {
      if (!mounted) return;
      setState(() => _loading = false);
      _showMessage(AppException.from(error).message);
    }
  }

  Future<void> _selectDateRange() async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: _from == null || _to == null
          ? null
          : DateTimeRange(start: _from!, end: _to!),
    );
    if (range == null || !mounted) return;
    setState(() {
      _from = range.start;
      _to = range.end;
    });
    await _load(reset: true);
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Lịch sử chuyến')),
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String?>(
                  initialValue: _status,
                  decoration: const InputDecoration(labelText: 'Trạng thái'),
                  items: const [
                    DropdownMenuItem(value: null, child: Text('Tất cả')),
                    DropdownMenuItem(
                      value: 'COMPLETED',
                      child: Text('Hoàn thành'),
                    ),
                    DropdownMenuItem(value: 'CANCELLED', child: Text('Đã hủy')),
                    DropdownMenuItem(
                      value: 'NO_DRIVER_FOUND',
                      child: Text('Không tìm thấy tài xế'),
                    ),
                  ],
                  onChanged: (value) {
                    setState(() => _status = value);
                    _load(reset: true);
                  },
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                tooltip: _from == null
                    ? 'Lọc theo ngày'
                    : '${_dateLabel(_from!)} - ${_dateLabel(_to!)}',
                onPressed: _selectDateRange,
                icon: const Icon(Icons.date_range),
              ),
              if (_from != null)
                IconButton(
                  tooltip: 'Xóa bộ lọc ngày',
                  onPressed: () {
                    setState(() {
                      _from = null;
                      _to = null;
                    });
                    _load(reset: true);
                  },
                  icon: const Icon(Icons.clear),
                ),
            ],
          ),
        ),
        Expanded(
          child: _loading && _rides.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : _rides.isEmpty
              ? const Center(child: Text('Chưa có chuyến nào'))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _rides.length + (_page < _totalPages ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == _rides.length) {
                      return Center(
                        child: TextButton(
                          onPressed: _loading
                              ? null
                              : () {
                                  _page++;
                                  _load(reset: false);
                                },
                          child: const Text('Tải thêm'),
                        ),
                      );
                    }
                    final ride = _rides[index];
                    return Card(
                      child: ListTile(
                        title: Text(
                          '${ride.rideCode} · ${_statusLabel(ride.status)}',
                        ),
                        subtitle: Text(
                          '${ride.pickupAddress}\n${ride.dropoffAddress}',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: Text(
                          Formatters.currency(
                            ride.finalFare ?? ride.estimatedFare,
                          ),
                        ),
                        isThreeLine: true,
                        onTap: () => context.push('/rides/${ride.id}'),
                      ),
                    );
                  },
                ),
        ),
      ],
    ),
  );
}

class RideDetailsPage extends ConsumerStatefulWidget {
  const RideDetailsPage({required this.rideId, super.key});

  final String rideId;

  @override
  ConsumerState<RideDetailsPage> createState() => _RideDetailsPageState();
}

class _RideDetailsPageState extends ConsumerState<RideDetailsPage> {
  ActiveRideModel? _ride;
  List<RideHistoryEventModel> _history = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait<Object>([
        ref.read(rideRepositoryProvider).getRide(widget.rideId),
        ref.read(rideRepositoryProvider).getRideHistoryEvents(widget.rideId),
      ]);
      if (!mounted) return;
      setState(() {
        _ride = results[0] as ActiveRideModel;
        _history = results[1] as List<RideHistoryEventModel>;
        _loading = false;
        _error = null;
      });
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = AppException.from(error).message;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ride = _ride;
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (ride == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết chuyến')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error ?? 'Không tải được chuyến xe'),
              FilledButton(onPressed: _load, child: const Text('Thử lại')),
            ],
          ),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: Text('Chuyến ${ride.rideCode}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SizedBox(
            height: 240,
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
                        ),
                      ),
                      Marker(
                        point: LatLng(
                          ride.dropoffLatitude,
                          ride.dropoffLongitude,
                        ),
                        width: 40,
                        height: 40,
                        child: const Icon(Icons.flag, color: Colors.red),
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
          _DetailLine('Trạng thái', _statusLabel(ride.status)),
          _DetailLine('Điểm đón', ride.pickupAddress),
          _DetailLine('Điểm trả', ride.dropoffAddress),
          _DetailLine('Khoảng cách', Formatters.distance(ride.distanceKm)),
          _DetailLine('Hình thức thanh toán', ride.paymentMethod),
          _DetailLine('Cước dự kiến', Formatters.currency(ride.estimatedFare)),
          if (ride.finalFare != null)
            _DetailLine('Cước cuối', Formatters.currency(ride.finalFare!)),
          if (ride.platformFee != null)
            _DetailLine('Phí nền tảng', Formatters.currency(ride.platformFee!)),
          if (ride.driverEarning != null)
            _DetailLine(
              'Thu nhập ròng',
              Formatters.currency(ride.driverEarning!),
            ),
          if (ride.cancelReason != null)
            _DetailLine('Lý do hủy', ride.cancelReason!),
          const SizedBox(height: 12),
          Text('Mốc thời gian', style: Theme.of(context).textTheme.titleLarge),
          ..._history.map(
            (event) => ListTile(
              leading: const Icon(Icons.history),
              title: Text(_statusLabel(event.toStatus)),
              subtitle: Text(
                '${Formatters.serverTime(event.changedAt.toIso8601String())}'
                ' · ${event.changedByType}${event.note == null ? '' : '\n${event.note}'}',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailLine extends StatelessWidget {
  const _DetailLine(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 135,
          child: Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
        Expanded(child: Text(value)),
      ],
    ),
  );
}

String _statusLabel(String status) => switch (status) {
  'SEARCHING' => 'Đang tìm tài xế',
  'ACCEPTED' => 'Đã nhận chuyến',
  'ARRIVED' => 'Đã đến điểm đón',
  'IN_PROGRESS' => 'Đang thực hiện',
  'COMPLETED' => 'Hoàn thành',
  'CANCELLED' => 'Đã hủy',
  'NO_DRIVER_FOUND' => 'Không tìm thấy tài xế',
  _ => status,
};

String _dateLabel(DateTime date) =>
    '${date.day.toString().padLeft(2, '0')}/'
    '${date.month.toString().padLeft(2, '0')}/'
    '${date.year}';
