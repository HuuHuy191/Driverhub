import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/errors/app_exception.dart';
import '../../data/repositories/auth_repository.dart';
import '../../services/driver_realtime_service.dart';
import '../auth/application/auth_controller.dart';

class ChangePasswordPage extends ConsumerStatefulWidget {
  const ChangePasswordPage({super.key});

  @override
  ConsumerState<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends ConsumerState<ChangePasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _currentPassword = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();
  bool _saving = false;
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _currentPassword.dispose();
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _saving) return;
    setState(() => _saving = true);
    try {
      await ref.read(authRepositoryProvider).changePassword(
        currentPassword: _currentPassword.text,
        newPassword: _newPassword.text,
      );
      if (!mounted) return;
      ref.read(driverRealtimeServiceProvider).disconnect();
      await ref.read(authControllerProvider.notifier).logout();
      if (!mounted) return;
      context.go('/');
    } on Object catch (error) {
      if (!mounted) return;
      _showMessage(AppException.from(error).message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Đổi mật khẩu')),
    body: SafeArea(
      child: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Mật khẩu mới cần có ít nhất 8 ký tự, gồm chữ cái và chữ số. '
              'Sau khi đổi, bạn sẽ cần đăng nhập lại.',
            ),
            const SizedBox(height: 20),
            _passwordField(
              controller: _currentPassword,
              label: 'Mật khẩu hiện tại',
              obscure: _obscureCurrent,
              autofillHints: const [AutofillHints.password],
              toggle: () => setState(
                () => _obscureCurrent = !_obscureCurrent,
              ),
            ),
            const SizedBox(height: 16),
            _passwordField(
              controller: _newPassword,
              label: 'Mật khẩu mới',
              obscure: _obscureNew,
              autofillHints: const [AutofillHints.newPassword],
              toggle: () => setState(() => _obscureNew = !_obscureNew),
              validator: _validateNewPassword,
            ),
            const SizedBox(height: 16),
            _passwordField(
              controller: _confirmPassword,
              label: 'Nhập lại mật khẩu mới',
              obscure: _obscureConfirm,
              autofillHints: const [AutofillHints.newPassword],
              toggle: () => setState(
                () => _obscureConfirm = !_obscureConfirm,
              ),
              validator: (value) => value != _newPassword.text
                  ? 'Mật khẩu nhập lại không khớp'
                  : null,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Cập nhật mật khẩu'),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _passwordField({
    required TextEditingController controller,
    required String label,
    required bool obscure,
    required Iterable<String> autofillHints,
    required VoidCallback toggle,
    String? Function(String?)? validator,
  }) => TextFormField(
    controller: controller,
    obscureText: obscure,
    autofillHints: autofillHints,
    decoration: InputDecoration(
      labelText: label,
      border: const OutlineInputBorder(),
      suffixIcon: IconButton(
        tooltip: obscure ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
        onPressed: toggle,
        icon: Icon(
          obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
        ),
      ),
    ),
    validator:
        validator ??
        (value) => value == null || value.isEmpty
            ? 'Vui lòng nhập $label'
            : null,
  );

  String? _validateNewPassword(String? value) {
    if (value == null || value.isEmpty) return 'Vui lòng nhập mật khẩu mới';
    if (!RegExp(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$').hasMatch(value)) {
      return 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ cái và chữ số';
    }
    if (value == _currentPassword.text) {
      return 'Mật khẩu mới phải khác mật khẩu hiện tại';
    }
    return null;
  }
}
