import 'dart:io';
import 'dart:ui' as ui;

import 'package:driver_mobile/main.dart';
import 'package:driver_mobile/services/secure_storage_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker_platform_interface/image_picker_platform_interface.dart';
import 'package:integration_test/integration_test.dart';

// BR-03, BR-07, BR-16: real UI and HTTP; the native photo chooser and token
// storage use isolated replacements. The isolated test backend additionally
// simulates Cloudinary. See docs/SETUP.md for the backend and test commands.
// Creates a clearly labelled PENDING test profile; never approves it.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('register four documents and log in to pending approval', (
    tester,
  ) async {
    final stamp = DateTime.now().millisecondsSinceEpoch.toString();
    final email = 'test.mobile.$stamp@example.com';
    final password = 'Test$stamp!';
    final directory = await Directory.systemTemp.createTemp('driverhub-test-');
    final recorder = ui.PictureRecorder();
    Canvas(recorder).drawRect(
      const Rect.fromLTWH(0, 0, 64, 64),
      Paint()..color = const Color(0xff008577),
    );
    final image = await recorder.endRecording().toImage(64, 64);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = await File(
      '${directory.path}/test-only.png',
    ).writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
    final originalPicker = ImagePickerPlatform.instance;
    ImagePickerPlatform.instance = _TestImagePicker(file.path);
    addTearDown(() async {
      ImagePickerPlatform.instance = originalPicker;
      await directory.delete(recursive: true);
    });

    Future<void> tapText(String text) async {
      final target = find.text(text);
      await tester.ensureVisible(target);
      await tester.tap(target);
      await tester.pumpAndSettle();
    }

    Future<void> enter(String label, String value) async {
      final target = find.widgetWithText(TextFormField, label);
      await tester.ensureVisible(target);
      await tester.enterText(target, value);
      tester.testTextInput.hide();
      await tester.pumpAndSettle();
    }

    Future<void> waitFor(String text) async {
      final deadline = DateTime.now().add(const Duration(seconds: 60));
      while (find.text(text).evaluate().isEmpty &&
          DateTime.now().isBefore(deadline)) {
        await tester.pump(const Duration(milliseconds: 250));
      }
      expect(find.text(text), findsOneWidget);
    }

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageServiceProvider.overrideWithValue(_TestTokenStorage()),
        ],
        child: const DriverHubApp(),
      ),
    );
    await tester.pumpAndSettle();
    await tapText('Chưa có tài khoản? Đăng ký');
    await enter('Email', email);
    await tapText('Tiếp tục');
    await enter('Họ và tên', 'TEST Mobile Registration');
    await enter('Số điện thoại', '08${stamp.substring(stamp.length - 8)}');
    await tapText('Chọn ngày sinh');
    await tapText('OK');
    await enter('Mật khẩu', password);
    await enter('Nhập lại mật khẩu', password);
    await tapText('Tiếp tục');
    await enter('Hãng xe', 'Honda');
    await enter('Dòng xe', 'TEST');
    await enter('Biển số xe', 'TEST-M${stamp.substring(stamp.length - 8)}');
    await tapText('Tiếp tục');
    for (final label in [
      'Mặt trước CCCD',
      'Mặt sau CCCD',
      'Giấy phép lái xe',
      'Đăng ký xe',
    ]) {
      await tapText(label);
      await tapText('Chọn từ thư viện');
    }
    expect(find.text('Đã chọn ảnh'), findsNWidgets(4));
    await tapText('Gửi hồ sơ đăng ký');
    await waitFor('Đăng nhập tài xế');
    await enter('Email', email);
    await enter('Mật khẩu', password);
    await tapText('Đăng nhập');
    await waitFor('Hồ sơ đang chờ duyệt');
    // Synthetic identifier only: never log passwords, tokens or documents.
    debugPrint('REGISTRATION_TEST_EMAIL=$email');
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
  });
}

class _TestImagePicker extends ImagePickerPlatform {
  _TestImagePicker(this.path);
  final String path;

  @override
  Future<XFile?> getImageFromSource({
    required ImageSource source,
    ImagePickerOptions options = const ImagePickerOptions(),
  }) async => XFile(path, mimeType: 'image/png');
}

class _TestTokenStorage extends SecureStorageService {
  String? _token;
  @override
  Future<String?> readRefreshToken() async => _token;
  @override
  Future<void> saveRefreshToken(String refreshToken) async =>
      _token = refreshToken;
  @override
  Future<void> clearRefreshToken() async => _token = null;
}
