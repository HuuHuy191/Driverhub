import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/app_exception.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/driver_statistics.dart';
import '../../data/repositories/driver_repository.dart';

class StatisticsPage extends ConsumerStatefulWidget {
  const StatisticsPage({super.key});

  @override
  ConsumerState<StatisticsPage> createState() => _StatisticsPageState();
}

class _StatisticsPageState extends ConsumerState<StatisticsPage> {
  late DateTime _from;
  late DateTime _to;
  DriverStatisticsModel? _statistics;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _to = DateTime.now();
    _from = DateTime(
      _to.year,
      _to.month,
      _to.day,
    ).subtract(const Duration(days: 6));
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(driverRepositoryProvider)
          .getStatistics(from: _from, to: _to);
      if (mounted) {
        setState(() {
          _statistics = result;
          _loading = false;
        });
      }
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = AppException.from(error).message;
      });
    }
  }

  Future<void> _selectRange() async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(start: _from, end: _to),
    );
    if (range == null || !mounted) return;
    setState(() {
      _from = range.start;
      _to = range.end;
    });
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final stats = _statistics;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thống kê thu nhập'),
        actions: [
          IconButton(
            tooltip: 'Chọn khoảng ngày',
            onPressed: _selectRange,
            icon: const Icon(Icons.date_range),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : stats == null
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_error ?? 'Không tải được thống kê'),
                  FilledButton(onPressed: _load, child: const Text('Thử lại')),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                    '${_dateLabel(_from)} – ${_dateLabel(_to)}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 12),
                  _StatCard(
                    title: 'Thu nhập ròng',
                    value: Formatters.currency(stats.summary.netEarning),
                  ),
                  _StatCard(
                    title: 'Tổng cước',
                    value: Formatters.currency(stats.summary.totalFare),
                  ),
                  _StatCard(
                    title: 'Phí nền tảng',
                    value: Formatters.currency(stats.summary.totalPlatformFee),
                  ),
                  _StatCard(
                    title: 'Chuyến hoàn thành',
                    value: '${stats.summary.totalRides}',
                  ),
                  _StatCard(
                    title: 'Tỷ lệ nhận chuyến',
                    value:
                        '${(stats.summary.acceptanceRate * 100).toStringAsFixed(0)}%',
                  ),
                  _StatCard(
                    title: 'Số lần hủy',
                    value: '${stats.summary.cancelCount}',
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Theo ngày',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  if (stats.breakdown.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 20),
                      child: Text('Chưa có dữ liệu trong khoảng thời gian này'),
                    )
                  else
                    ..._dailyBars(stats.breakdown),
                ],
              ),
            ),
    );
  }

  List<Widget> _dailyBars(List<DriverStatisticsPoint> points) {
    final maxValue = points
        .map((point) => point.netEarning)
        .fold<int>(0, (max, value) => value > max ? value : max);
    return points
        .map((point) {
          final fraction = maxValue == 0 ? 0.0 : point.netEarning / maxValue;
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(_dateLabel(point.date)),
                    Text(Formatters.currency(point.netEarning)),
                  ],
                ),
                const SizedBox(height: 4),
                LinearProgressIndicator(value: fraction),
                Text('${point.rides} chuyến'),
              ],
            ),
          );
        })
        .toList(growable: false);
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.title, required this.value});

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      title: Text(title),
      trailing: Text(value, style: Theme.of(context).textTheme.titleMedium),
    ),
  );
}

String _dateLabel(DateTime date) =>
    '${date.day.toString().padLeft(2, '0')}/'
    '${date.month.toString().padLeft(2, '0')}/'
    '${date.year}';
