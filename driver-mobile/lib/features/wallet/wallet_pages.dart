import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/errors/app_exception.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/wallet_models.dart';
import '../../data/repositories/wallet_repository.dart';

class WalletPage extends ConsumerStatefulWidget {
  const WalletPage({super.key});

  @override
  ConsumerState<WalletPage> createState() => _WalletPageState();
}

class _WalletPageState extends ConsumerState<WalletPage> {
  WalletModel? _wallet;
  List<TopupRequestModel> _requests = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait<Object>([
        ref.read(walletRepositoryProvider).getWallet(),
        ref.read(walletRepositoryProvider).getTopupRequests(),
      ]);
      if (!mounted) return;
      setState(() {
        _wallet = results[0] as WalletModel;
        _requests = results[1] as List<TopupRequestModel>;
        _loading = false;
      });
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = AppException.from(error).message;
      });
    }
  }

  Future<void> _openTopup() async {
    final created = await context.push<bool>('/top-up');
    if (created == true && mounted) await _load();
  }

  @override
  Widget build(BuildContext context) {
    final wallet = _wallet;
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (wallet == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Ví tài xế')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error ?? 'Không tải được thông tin ví'),
              FilledButton(onPressed: _load, child: const Text('Thử lại')),
            ],
          ),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Ví tài xế')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Số dư hiện tại'),
                    const SizedBox(height: 8),
                    Text(
                      Formatters.currency(wallet.balance),
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Hạn mức số dư âm: ${Formatters.currency(wallet.maxNegativeBalance)}',
                    ),
                    Text(
                      'Khoảng còn có thể sử dụng: ${Formatters.currency(wallet.availableMargin)}',
                    ),
                    if (wallet.warningMessage != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        wallet.warningMessage!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _openTopup,
              icon: const Icon(Icons.add_card),
              label: const Text('Tạo yêu cầu nạp tiền'),
            ),
            OutlinedButton.icon(
              onPressed: () => context.push('/transactions'),
              icon: const Icon(Icons.receipt_long),
              label: const Text('Lịch sử giao dịch'),
            ),
            const SizedBox(height: 20),
            Text(
              'Yêu cầu nạp tiền',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (_requests.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text('Chưa có yêu cầu nạp tiền'),
              )
            else
              ..._requests.map(
                (request) => Card(
                  child: ListTile(
                    leading: const Icon(Icons.receipt_outlined),
                    title: Text(Formatters.currency(request.amount)),
                    subtitle: Text(
                      '${_topupStatus(request.status)} · '
                      '${Formatters.serverTime(request.createdAt.toIso8601String())}'
                      '${request.rejectReason == null ? '' : '\n${request.rejectReason}'}',
                    ),
                    isThreeLine: request.rejectReason != null,
                    trailing: request.receiptUrl == null
                        ? null
                        : const Icon(Icons.image_outlined),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class WalletTransactionsPage extends ConsumerStatefulWidget {
  const WalletTransactionsPage({super.key});

  @override
  ConsumerState<WalletTransactionsPage> createState() =>
      _WalletTransactionsPageState();
}

class _WalletTransactionsPageState
    extends ConsumerState<WalletTransactionsPage> {
  List<WalletTransactionModel> _transactions = [];
  int _page = 1;
  int _totalPages = 1;
  String? _type;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load(reset: true));
  }

  Future<void> _load({required bool reset}) async {
    setState(() => _loading = true);
    try {
      final result = await ref
          .read(walletRepositoryProvider)
          .getTransactions(page: reset ? 1 : _page, type: _type);
      if (!mounted) return;
      setState(() {
        _transactions = reset
            ? result.transactions
            : [..._transactions, ...result.transactions];
        _page = reset ? 1 : _page;
        _totalPages = result.totalPages;
        _loading = false;
      });
    } on Object catch (error) {
      if (!mounted) return;
      setState(() => _loading = false);
      _showMessage(AppException.from(error).message);
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Lịch sử giao dịch')),
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: DropdownButtonFormField<String?>(
            initialValue: _type,
            decoration: const InputDecoration(labelText: 'Loại giao dịch'),
            items: const [
              DropdownMenuItem(value: null, child: Text('Tất cả')),
              DropdownMenuItem(
                value: 'COMMISSION_FEE',
                child: Text('Phí nền tảng'),
              ),
              DropdownMenuItem(value: 'TOPUP', child: Text('Nạp tiền')),
              DropdownMenuItem(
                value: 'ADJUSTMENT',
                child: Text('Điều chỉnh số dư'),
              ),
              DropdownMenuItem(value: 'WITHDRAW', child: Text('Rút tiền')),
            ],
            onChanged: (value) {
              setState(() => _type = value);
              _load(reset: true);
            },
          ),
        ),
        Expanded(
          child: _loading && _transactions.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : _transactions.isEmpty
              ? const Center(child: Text('Chưa có giao dịch'))
              : ListView.builder(
                  itemCount:
                      _transactions.length + (_page < _totalPages ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == _transactions.length) {
                      return TextButton(
                        onPressed: _loading
                            ? null
                            : () {
                                _page++;
                                _load(reset: false);
                              },
                        child: const Text('Tải thêm'),
                      );
                    }
                    final tx = _transactions[index];
                    final isCredit = tx.direction == 'CREDIT';
                    return ListTile(
                      leading: CircleAvatar(
                        child: Icon(
                          isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                        ),
                      ),
                      title: Text(tx.typeLabel),
                      subtitle: Text(
                        '${tx.description}\n'
                        '${Formatters.serverTime(tx.createdAt.toIso8601String())}'
                        '${tx.ride == null ? '' : '\nChuyến ${tx.ride!.rideCode}'}',
                      ),
                      isThreeLine: true,
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${isCredit ? '+' : '-'}${Formatters.currency(tx.amount)}',
                            style: TextStyle(
                              color: isCredit
                                  ? Colors.green.shade700
                                  : Theme.of(context).colorScheme.error,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text('Dư ${Formatters.currency(tx.balanceAfter)}'),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    ),
  );
}

class TopupPage extends ConsumerStatefulWidget {
  const TopupPage({super.key});

  @override
  ConsumerState<TopupPage> createState() => _TopupPageState();
}

class _TopupPageState extends ConsumerState<TopupPage> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  File? _receipt;
  bool _submitting = false;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _chooseReceipt() async {
    final image = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (image != null && mounted) {
      setState(() => _receipt = File(image.path));
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _submitting) return;
    setState(() => _submitting = true);
    try {
      final amount = int.parse(_amountController.text.trim());
      await ref
          .read(walletRepositoryProvider)
          .createTopup(amount: amount, receipt: _receipt);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã gửi yêu cầu nạp tiền chờ duyệt.')),
        );
        context.pop(true);
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppException.from(error).message)),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Nạp tiền')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Đây là yêu cầu nạp tiền mô phỏng. Quản trị viên sẽ kiểm tra và duyệt.',
        ),
        const SizedBox(height: 16),
        Form(
          key: _formKey,
          child: TextFormField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Số tiền (VNĐ)',
              prefixIcon: Icon(Icons.payments_outlined),
            ),
            validator: (value) {
              final amount = int.tryParse((value ?? '').trim());
              if (amount == null || amount <= 0) {
                return 'Vui lòng nhập số tiền hợp lệ';
              }
              return null;
            },
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _chooseReceipt,
          icon: const Icon(Icons.image_outlined),
          label: Text(
            _receipt == null
                ? 'Chọn ảnh biên lai (không bắt buộc)'
                : 'Đã chọn: ${_receipt!.uri.pathSegments.last}',
          ),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _submitting ? null : _submit,
          child: _submitting
              ? const CircularProgressIndicator()
              : const Text('Gửi yêu cầu'),
        ),
      ],
    ),
  );
}

String _topupStatus(String status) => switch (status) {
  'PENDING' => 'Chờ duyệt',
  'APPROVED' => 'Đã duyệt',
  'REJECTED' => 'Từ chối',
  _ => status,
};
