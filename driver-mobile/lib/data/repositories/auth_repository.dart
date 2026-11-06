import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/api_client.dart';
import '../models/auth_models.dart';
import '../models/driver_profile_model.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(apiClientProvider)),
);

class AuthRepository {
  AuthRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<AuthSessionModel> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'email': email.trim(), 'password': password},
    );
    final session = AuthSessionModel.fromJson(
      Map<String, dynamic>.from(response.data!['data'] as Map),
    );
    await _apiClient.startSession(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    return session;
  }

  Future<void> registerDriver({required Map<String, String> fields}) async {
    await _apiClient.post<Map<String, dynamic>>('/auth/register', data: fields);
  }

  Future<AuthProfileModel?> restoreProfile() async {
    final restored = await _apiClient.restoreSession();
    if (!restored) return null;

    try {
      return await currentProfile();
    } on Object {
      await _apiClient.clearSession();
      rethrow;
    }
  }

  Future<AuthProfileModel> currentProfile() async {
    final response = await _apiClient.get<Map<String, dynamic>>('/auth/me');
    return AuthProfileModel.fromJson(
      Map<String, dynamic>.from(response.data!['data'] as Map),
    );
  }

  Future<void> logout() => _apiClient.logout();

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _apiClient.patch<Map<String, dynamic>>(
      '/auth/password/change',
      data: {'currentPassword': currentPassword, 'newPassword': newPassword},
    );
  }

  Future<DriverProfileModel> getDriverProfile() async {
    final response = await _apiClient.get<Map<String, dynamic>>('/drivers/me');
    return DriverProfileModel.fromJson(
      Map<String, dynamic>.from(response.data!['data'] as Map),
    );
  }

  Future<DriverProfileModel> updateDriverProfile(
    Map<String, dynamic> data,
  ) async {
    final response = await _apiClient.patch<Map<String, dynamic>>(
      '/drivers/me',
      data: data,
    );
    return DriverProfileModel.fromJson(
      Map<String, dynamic>.from(response.data!['data'] as Map),
    );
  }

  Future<String> uploadAvatar(File file) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/drivers/me/avatar',
      data: FormData.fromMap({'file': await MultipartFile.fromFile(file.path)}),
    );
    return (response.data!['data'] as Map)['avatarUrl'] as String;
  }
}
