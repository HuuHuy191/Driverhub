import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/errors/app_exception.dart';
import '../../../data/repositories/auth_repository.dart';

class RegistrationFlowScreen extends ConsumerStatefulWidget {
  const RegistrationFlowScreen({super.key});

  @override
  ConsumerState<RegistrationFlowScreen> createState() =>
      _RegistrationFlowScreenState();
}

class _RegistrationFlowScreenState
    extends ConsumerState<RegistrationFlowScreen> {
  final _emailFormKey = GlobalKey<FormState>();
  final _profileFormKey = GlobalKey<FormState>();
  final _vehicleFormKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _citizenIdController = TextEditingController();
  final _driverLicenseController = TextEditingController();
  final _addressController = TextEditingController();
  final _vehicleBrandController = TextEditingController();
  final _vehicleModelController = TextEditingController();
  final _vehiclePlateController = TextEditingController();
  final _vehicleColorController = TextEditingController();
  bool _isSubmitting = false;
  bool _obscurePassword = true;
  _RegistrationStep _step = _RegistrationStep.email;
  DateTime? _dateOfBirth;
  DateTime? _citizenIdIssueDate;
  DateTime? _driverLicenseIssueDate;
  String _vehicleType = 'MOTORBIKE';

  @override
  void dispose() {
    _emailController.dispose();
    _fullNameController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _phoneController.dispose();
    _citizenIdController.dispose();
    _driverLicenseController.dispose();
    _addressController.dispose();
    _vehicleBrandController.dispose();
    _vehicleModelController.dispose();
    _vehiclePlateController.dispose();
    _vehicleColorController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Đăng ký tài xế'),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () => context.go('/'),
      ),
    ),
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: switch (_step) {
              _RegistrationStep.email => _buildEmailStep(context),
              _RegistrationStep.profile => _buildProfileStep(context),
              _RegistrationStep.vehicle => _buildVehicleStep(context),
            },
          ),
        ),
      ),
    ),
  );

  Widget _buildEmailStep(BuildContext context) => Form(
    key: _emailFormKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Bước 1/3: Email đăng ký'),
        const SizedBox(height: 20),
        Text(
          'Nhập email sẽ dùng để đăng nhập.',
          style: Theme.of(context).textTheme.bodyLarge,
        ),
        const SizedBox(height: 24),
        TextFormField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
          decoration: const InputDecoration(
            labelText: 'Email',
            prefixIcon: Icon(Icons.email_outlined),
          ),
          validator: _validateEmail,
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: _continueToProfile,
          child: const Text('Tiếp tục'),
        ),
      ],
    ),
  );

  Widget _buildProfileStep(BuildContext context) => Form(
    key: _profileFormKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Bước 2/3: Thông tin cá nhân và CCCD'),
        const SizedBox(height: 20),
        TextFormField(
          controller: _fullNameController,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Họ và tên'),
          validator: (value) => _requiredWithMaxLength(value, 150, 'Họ và tên'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Số điện thoại'),
          validator: (value) => RegExp(r'^0\d{9}$').hasMatch(value ?? '')
              ? null
              : 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0',
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: _selectDateOfBirth,
          icon: const Icon(Icons.calendar_today_outlined),
          label: Text(
            _dateOfBirth == null
                ? 'Chọn ngày sinh'
                : 'Ngày sinh: ${_formatDate(_dateOfBirth!)}',
          ),
        ),
        if (_dateOfBirth == null)
          const Padding(
            padding: EdgeInsets.only(top: 4),
            child: Text('Vui lòng chọn ngày sinh'),
          ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _citizenIdController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Số CCCD'),
          validator: (value) => _requiredWithMaxLength(value, 20, 'Số CCCD'),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: _selectCitizenIdIssueDate,
          icon: const Icon(Icons.calendar_today_outlined),
          label: Text(
            _citizenIdIssueDate == null
                ? 'Chọn ngày cấp CCCD'
                : 'Ngày cấp CCCD: ${_formatDate(_citizenIdIssueDate!)}',
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _addressController,
          maxLines: 2,
          maxLength: 500,
          decoration: const InputDecoration(
            labelText: 'Địa chỉ tạm trú (tùy chọn)',
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          decoration: InputDecoration(
            labelText: 'Mật khẩu',
            helperText: 'Ít nhất 8 ký tự, gồm chữ và số',
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
              ),
              onPressed: () =>
                  setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
          validator: (value) =>
              RegExp(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$').hasMatch(value ?? '')
              ? null
              : 'Mật khẩu chưa đúng yêu cầu',
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _confirmPasswordController,
          obscureText: _obscurePassword,
          decoration: const InputDecoration(labelText: 'Nhập lại mật khẩu'),
          validator: (value) => value == _passwordController.text
              ? null
              : 'Mật khẩu nhập lại không khớp',
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: _continueToVehicle,
          child: const Text('Tiếp tục'),
        ),
      ],
    ),
  );

  Widget _buildVehicleStep(BuildContext context) => Form(
    key: _vehicleFormKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Bước 3/3: Thông tin phương tiện và GPLX'),
        const SizedBox(height: 20),
        DropdownButtonFormField<String>(
          initialValue: _vehicleType,
          decoration: const InputDecoration(labelText: 'Loại phương tiện'),
          items: const [
            DropdownMenuItem(value: 'MOTORBIKE', child: Text('Xe máy')),
            DropdownMenuItem(value: 'CAR', child: Text('Ô tô')),
          ],
          onChanged: (value) => setState(() => _vehicleType = value!),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _vehicleBrandController,
          decoration: const InputDecoration(labelText: 'Hãng xe'),
          validator: (value) => _requiredWithMaxLength(value, 100, 'Hãng xe'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _vehicleModelController,
          decoration: const InputDecoration(labelText: 'Dòng xe'),
          validator: (value) => _requiredWithMaxLength(value, 100, 'Dòng xe'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _vehiclePlateController,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(labelText: 'Biển số xe'),
          validator: (value) => _requiredWithMaxLength(value, 20, 'Biển số xe'),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _vehicleColorController,
          decoration: const InputDecoration(labelText: 'Màu xe (tùy chọn)'),
          validator: (value) =>
              (value?.length ?? 0) <= 50 ? null : 'Màu xe tối đa 50 ký tự',
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _driverLicenseController,
          decoration: const InputDecoration(
            labelText: 'Mã số giấy phép lái xe',
          ),
          validator: (value) =>
              _requiredWithMaxLength(value, 30, 'Mã số giấy phép lái xe'),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: _selectDriverLicenseIssueDate,
          icon: const Icon(Icons.calendar_today_outlined),
          label: Text(
            _driverLicenseIssueDate == null
                ? 'Chọn ngày cấp giấy phép lái xe'
                : 'Ngày cấp GPLX: ${_formatDate(_driverLicenseIssueDate!)}',
          ),
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: _isSubmitting ? null : _submitRegistration,
          child: const Text('Gửi hồ sơ đăng ký'),
        ),
        TextButton(
          onPressed: () => setState(() => _step = _RegistrationStep.profile),
          child: const Text('Quay lại'),
        ),
      ],
    ),
  );

  void _continueToProfile() {
    if (!(_emailFormKey.currentState?.validate() ?? false)) return;
    setState(() => _step = _RegistrationStep.profile);
  }

  Future<void> _selectDateOfBirth() async {
    final selected = await showDatePicker(
      context: context,
      initialDate: _dateOfBirth ?? DateTime(2000),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (selected != null && mounted) setState(() => _dateOfBirth = selected);
  }

  Future<void> _selectCitizenIdIssueDate() async {
    final selected = await showDatePicker(
      context: context,
      initialDate: _citizenIdIssueDate ?? DateTime.now(),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (selected != null && mounted) {
      setState(() => _citizenIdIssueDate = selected);
    }
  }

  Future<void> _selectDriverLicenseIssueDate() async {
    final selected = await showDatePicker(
      context: context,
      initialDate: _driverLicenseIssueDate ?? DateTime.now(),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (selected != null && mounted) {
      setState(() => _driverLicenseIssueDate = selected);
    }
  }

  void _continueToVehicle() {
    if (!(_profileFormKey.currentState?.validate() ?? false)) return;
    if (_dateOfBirth == null) {
      _showMessage('Vui lòng chọn ngày sinh.', isError: true);
      return;
    }
    if (_citizenIdIssueDate == null) {
      _showMessage('Vui lòng chọn ngày cấp CCCD.', isError: true);
      return;
    }
    setState(() => _step = _RegistrationStep.vehicle);
  }

  Future<void> _submitRegistration() async {
    if (!(_vehicleFormKey.currentState?.validate() ?? false)) return;
    if (_driverLicenseIssueDate == null) {
      _showMessage('Vui lòng chọn ngày cấp giấy phép lái xe.', isError: true);
      return;
    }
    await _runRequest(() async {
      await ref
          .read(authRepositoryProvider)
          .registerDriver(
            fields: <String, String>{
              'email': _emailController.text.trim(),
              'password': _passwordController.text,
              'fullName': _fullNameController.text.trim(),
              'phoneNumber': _phoneController.text.trim(),
              'dateOfBirth': _apiDate(_dateOfBirth!),
              'citizenIdNumber': _citizenIdController.text.trim(),
              'citizenIdIssueDate': _apiDate(_citizenIdIssueDate!),
              'driverLicenseNumber': _driverLicenseController.text.trim(),
              'driverLicenseIssueDate': _apiDate(_driverLicenseIssueDate!),
              'vehicleType': _vehicleType,
              'vehicleBrand': _vehicleBrandController.text.trim(),
              'vehicleModelName': _vehicleModelController.text.trim(),
              'vehicleLicensePlate': _vehiclePlateController.text.trim(),
              if (_addressController.text.trim().isNotEmpty)
                'temporaryAddress': _addressController.text.trim(),
              if (_vehicleColorController.text.trim().isNotEmpty)
                'vehicleColor': _vehicleColorController.text.trim(),
            },
          );
      if (mounted) {
        _showMessage('Hồ sơ đã được gửi. Bạn có thể đăng nhập để chờ duyệt.');
        context.go('/');
      }
    });
  }

  Future<void> _runRequest(Future<void> Function() request) async {
    setState(() => _isSubmitting = true);
    try {
      await request();
    } on Object catch (error) {
      if (mounted) {
        _showMessage(AppException.from(error).message, isError: true);
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    if (email.isEmpty) return 'Vui lòng nhập email';
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      return 'Email không hợp lệ';
    }
    return null;
  }

  String? _requiredWithMaxLength(String? value, int maxLength, String label) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return 'Vui lòng nhập $label';
    if (trimmed.length > maxLength) return '$label tối đa $maxLength ký tự';
    return null;
  }

  String _formatDate(DateTime date) =>
      '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';

  String _apiDate(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  void _showMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Theme.of(context).colorScheme.error : null,
      ),
    );
  }
}

enum _RegistrationStep { email, profile, vehicle }
