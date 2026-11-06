import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/api_client.dart';
import '../models/driver_profile_model.dart';
import '../models/driver_statistics.dart';

final driverRepositoryProvider = Provider<DriverRepository>(
  (ref) => DriverRepository(ref.watch(apiClientProvider)),
);

class DriverRepository {
  DriverRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<DriverProfileModel> getProfile() async {
    final response = await _apiClient.get<Map<String, dynamic>>('/drivers/me');
    return DriverProfileModel.fromJson(
      Map<String, dynamic>.from(response.data!['data'] as Map),
    );
  }

  Future<DriverProfileModel> updateProfile({
    required String fullName,
    required String phoneNumber,
    String? dateOfBirth,
    String? citizenIdNumber,
    String? citizenIdIssueDate,
    String? driverLicenseNumber,
    String? driverLicenseIssueDate,
    required String temporaryAddress,
  }) async {
    final response = await _apiClient.patch<Map<String, dynamic>>(
      '/drivers/me',
      data: {
        'fullName': fullName,
        'phoneNumber': phoneNumber,
        if (dateOfBirth != null && dateOfBirth.isNotEmpty)
          'dateOfBirth': dateOfBirth,
        if (citizenIdNumber != null && citizenIdNumber.isNotEmpty)
          'citizenIdNumber': citizenIdNumber,
        if (citizenIdIssueDate != null && citizenIdIssueDate.isNotEmpty)
          'citizenIdIssueDate': citizenIdIssueDate,
        if (driverLicenseNumber != null && driverLicenseNumber.isNotEmpty)
          'driverLicenseNumber': driverLicenseNumber,
        if (driverLicenseIssueDate != null && driverLicenseIssueDate.isNotEmpty)
          'driverLicenseIssueDate': driverLicenseIssueDate,
        'temporaryAddress': temporaryAddress,
      },
    );
    return DriverProfileModel.fromJson(
      Map<String, dynamic>.from(response.data!['data'] as Map),
    );
  }

  Future<DriverProfileModel> uploadAvatar(File file) async {
    await _apiClient.post<Map<String, dynamic>>(
      '/drivers/me/avatar',
      data: FormData.fromMap({'file': await MultipartFile.fromFile(file.path)}),
    );
    return getProfile();
  }

  Future<void> resubmitProfile() async {
    await _apiClient.post<Map<String, dynamic>>('/drivers/me/resubmit');
  }

  Future<void> setOnlineStatus({
    required bool isOnline,
    double? latitude,
    double? longitude,
  }) async {
    await _apiClient.patch<Map<String, dynamic>>(
      '/drivers/me/status',
      data: {
        'isOnline': isOnline,
        'latitude': ?latitude,
        'longitude': ?longitude,
      },
    );
  }

  Future<DriverStatisticsModel> getStatistics({
    required DateTime from,
    required DateTime to,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/drivers/me/stats',
      queryParameters: {
        'from': _dateQuery(from),
        'to': _dateQuery(to),
        'groupBy': 'day',
      },
    );
    return DriverStatisticsModel.fromJson(
      Map<String, dynamic>.from(response.data!['data'] as Map),
    );
  }

  String _dateQuery(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-'
      '${date.month.toString().padLeft(2, '0')}-'
      '${date.day.toString().padLeft(2, '0')}';
}
