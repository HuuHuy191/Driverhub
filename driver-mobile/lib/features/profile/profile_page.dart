import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/errors/app_exception.dart';
import '../../data/models/driver_profile_model.dart';
import '../../data/repositories/driver_repository.dart';
import '../auth/application/auth_controller.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _citizenIdController = TextEditingController();
  final _driverLicenseController = TextEditingController();
  final _addressController = TextEditingController();
  final _picker = ImagePicker();
  DriverProfileModel? _profile;
  DateTime? _dateOfBirth;
  DateTime? _citizenIdIssueDate;
  DateTime? _driverLicenseIssueDate;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _citizenIdController.dispose();
    _driverLicenseController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repository = ref.read(driverRepositoryProvider);
      final profile = await repository.getProfile();
      if (!mounted) return;
      _nameController.text = profile.fullName;
      _phoneController.text = profile.phoneNumber;
      _citizenIdController.text = profile.citizenIdNumber ?? '';
      _driverLicenseController.text = profile.driverLicenseNumber ?? '';
      _addressController.text = profile.temporaryAddress ?? '';
      _dateOfBirth = profile.dateOfBirth == null
          ? null
          : DateTime.tryParse(profile.dateOfBirth!);
      _citizenIdIssueDate = profile.citizenIdIssueDate == null
          ? null
          : DateTime.tryParse(profile.citizenIdIssueDate!);
      _driverLicenseIssueDate = profile.driverLicenseIssueDate == null
          ? null
          : DateTime.tryParse(profile.driverLicenseIssueDate!);
      setState(() {
        _profile = profile;
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

  Future<bool> _save({bool showSuccess = true}) async {
    if (!_formKey.currentState!.validate() || _saving) return false;
    final needsIdentityInfo = _profile?.approvalStatus != 'APPROVED';
    if (needsIdentityInfo &&
        (_citizenIdIssueDate == null || _driverLicenseIssueDate == null)) {
      _showMessage('Vui lòng nhập ngày cấp CCCD và giấy phép lái xe.');
      return false;
    }
    setState(() => _saving = true);
    try {
      final profile = await ref
          .read(driverRepositoryProvider)
          .updateProfile(
            fullName: _nameController.text.trim(),
            phoneNumber: _phoneController.text.trim(),
            dateOfBirth: _dateOfBirth?.toIso8601String().substring(0, 10),
            citizenIdNumber: _citizenIdController.text.trim(),
            citizenIdIssueDate: _citizenIdIssueDate
                ?.toIso8601String()
                .substring(0, 10),
            driverLicenseNumber: _driverLicenseController.text.trim(),
            driverLicenseIssueDate: _driverLicenseIssueDate
                ?.toIso8601String()
                .substring(0, 10),
            temporaryAddress: _addressController.text.trim(),
          );
      if (!mounted) return false;
      setState(() => _profile = profile);
      if (showSuccess) _showMessage('Đã lưu thông tin hồ sơ.');
      return true;
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
      return false;
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _selectDateOfBirth() async {
    final now = DateTime.now();
    final selected = await showDatePicker(
      context: context,
      initialDate: _dateOfBirth ?? DateTime(now.year - 20, now.month, now.day),
      firstDate: DateTime(1900),
      lastDate: now,
    );
    if (selected != null && mounted) {
      setState(() => _dateOfBirth = selected);
    }
  }

  Future<void> _selectIssueDate({required bool citizenId}) async {
    final current = citizenId ? _citizenIdIssueDate : _driverLicenseIssueDate;
    final selected = await showDatePicker(
      context: context,
      initialDate: current ?? DateTime.now(),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (selected == null || !mounted) return;
    setState(() {
      if (citizenId) {
        _citizenIdIssueDate = selected;
      } else {
        _driverLicenseIssueDate = selected;
      }
    });
  }

  Future<void> _uploadAvatar() async {
    final image = await _picker.pickImage(source: ImageSource.gallery);
    if (image == null) return;
    try {
      final profile = await ref
          .read(driverRepositoryProvider)
          .uploadAvatar(File(image.path));
      if (mounted) setState(() => _profile = profile);
    } on Object catch (error) {
      _showMessage(AppException.from(error).message);
    }
  }

  Future<void> _resubmit() async {
    if (!await _save(showSuccess: false)) return;
    try {
      await ref.read(driverRepositoryProvider).resubmitProfile();
      await _load();
      await ref.read(authControllerProvider.notifier).restoreSession();
      if (mounted) _showMessage('Hồ sơ đã được gửi lại để duyệt.');
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

  @override
  Widget build(BuildContext context) {
    final profile = _profile;
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (profile == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Hồ sơ cá nhân')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error ?? 'Không tải được hồ sơ'),
              FilledButton(onPressed: _load, child: const Text('Thử lại')),
            ],
          ),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hồ sơ cá nhân'),
        actions: [
          IconButton(
            tooltip: 'Cài đặt',
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
            Center(
              child: CircleAvatar(
                radius: 44,
                backgroundImage: profile.avatarUrl == null
                    ? null
                    : NetworkImage(profile.avatarUrl!),
                child: profile.avatarUrl == null
                    ? const Icon(Icons.person, size: 44)
                    : null,
              ),
            ),
            Center(
              child: TextButton.icon(
                onPressed: _uploadAvatar,
                icon: const Icon(Icons.photo_camera_outlined),
                label: const Text('Đổi ảnh đại diện'),
              ),
            ),
            Card(
              child: ListTile(
                leading: Icon(
                  profile.approvalStatus == 'APPROVED'
                      ? Icons.verified
                      : Icons.hourglass_top,
                ),
                title: Text(
                  'Trạng thái: ${_approvalLabel(profile.approvalStatus)}',
                ),
                subtitle: profile.rejectReason == null
                    ? null
                    : Text(profile.rejectReason!),
              ),
            ),
            const SizedBox(height: 12),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _nameController,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Họ và tên'),
                    validator: (value) => value == null || value.trim().isEmpty
                        ? 'Vui lòng nhập họ tên'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Số điện thoại',
                    ),
                    validator: (value) =>
                        RegExp(r'^0\d{9}$').hasMatch(value ?? '')
                        ? null
                        : 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0',
                  ),
                  const SizedBox(height: 12),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Ngày sinh'),
                    subtitle: Text(
                      _dateOfBirth == null
                          ? 'Chưa cập nhật'
                          : _dateLabel(_dateOfBirth!),
                    ),
                    trailing: const Icon(Icons.calendar_today_outlined),
                    onTap: _selectDateOfBirth,
                  ),
                  TextFormField(
                    controller: _citizenIdController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Số CCCD'),
                    validator: (value) {
                      if (profile.approvalStatus != 'APPROVED' &&
                          (value == null || value.trim().isEmpty)) {
                        return 'Vui lòng nhập số CCCD';
                      }
                      if ((value?.trim().length ?? 0) > 20) {
                        return 'Số CCCD tối đa 20 ký tự';
                      }
                      return null;
                    },
                    enabled: profile.approvalStatus != 'APPROVED',
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Ngày cấp CCCD'),
                    subtitle: Text(
                      _citizenIdIssueDate == null
                          ? 'Chưa cập nhật'
                          : _dateLabel(_citizenIdIssueDate!),
                    ),
                    trailing: const Icon(Icons.calendar_today_outlined),
                    onTap: profile.approvalStatus == 'APPROVED'
                        ? null
                        : () => _selectIssueDate(citizenId: true),
                  ),
                  TextFormField(
                    controller: _driverLicenseController,
                    decoration: const InputDecoration(
                      labelText: 'Mã số giấy phép lái xe',
                    ),
                    validator: (value) {
                      if (profile.approvalStatus != 'APPROVED' &&
                          (value == null || value.trim().isEmpty)) {
                        return 'Vui lòng nhập mã số giấy phép lái xe';
                      }
                      if ((value?.trim().length ?? 0) > 30) {
                        return 'Mã số giấy phép lái xe tối đa 30 ký tự';
                      }
                      return null;
                    },
                    enabled: profile.approvalStatus != 'APPROVED',
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Ngày cấp giấy phép lái xe'),
                    subtitle: Text(
                      _driverLicenseIssueDate == null
                          ? 'Chưa cập nhật'
                          : _dateLabel(_driverLicenseIssueDate!),
                    ),
                    trailing: const Icon(Icons.calendar_today_outlined),
                    onTap: profile.approvalStatus == 'APPROVED'
                        ? null
                        : () => _selectIssueDate(citizenId: false),
                  ),
                  TextFormField(
                    controller: _addressController,
                    maxLines: 2,
                    maxLength: 500,
                    decoration: const InputDecoration(
                      labelText: 'Địa chỉ tạm trú',
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _saving ? null : () => _save(),
                      child: _saving
                          ? const CircularProgressIndicator()
                          : const Text('Lưu thông tin'),
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 32),
            Text('Phương tiện', style: Theme.of(context).textTheme.titleLarge),
            if (profile.vehicles.isEmpty)
              const ListTile(title: Text('Chưa có phương tiện'))
            else
              ...profile.vehicles.map(
                (vehicle) => ListTile(
                  leading: Icon(
                    vehicle.vehicleType == 'CAR'
                        ? Icons.directions_car
                        : Icons.two_wheeler,
                  ),
                  title: Text(
                    '${vehicle.brand} ${vehicle.modelName} · ${vehicle.licensePlate}',
                  ),
                  subtitle: Text(
                    '${_vehicleType(vehicle.vehicleType)} · '
                    '${_verificationLabel(vehicle.verificationStatus)}',
                  ),
                  trailing: vehicle.isActive
                      ? const Icon(Icons.check_circle, color: Colors.green)
                      : null,
                ),
              ),
            if (profile.approvalStatus == 'REJECTED') ...[
              const Divider(height: 32),
              Text(
                'Thông tin cần bổ sung',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const Text(
                'Cập nhật thông tin CCCD và giấy phép lái xe ở trên, lưu lại rồi gửi hồ sơ để duyệt lại.',
              ),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: _saving ? null : _resubmit,
                child: const Text('Gửi lại hồ sơ để duyệt'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

String _approvalLabel(String status) => switch (status) {
  'PENDING' => 'Chờ duyệt',
  'APPROVED' => 'Đã duyệt',
  'REJECTED' => 'Cần bổ sung',
  _ => status,
};

String _vehicleType(String type) => switch (type) {
  'MOTORBIKE' => 'Xe máy',
  'CAR' => 'Ô tô',
  _ => type,
};

String _verificationLabel(String status) => switch (status) {
  'PENDING' => 'Chờ xác minh',
  'APPROVED' => 'Đã xác minh',
  'REJECTED' => 'Bị từ chối',
  _ => status,
};

String _dateLabel(DateTime date) =>
    '${date.day.toString().padLeft(2, '0')}/'
    '${date.month.toString().padLeft(2, '0')}/'
    '${date.year}';
