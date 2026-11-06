import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config/app_config.dart';
import '../core/errors/app_exception.dart';
import 'access_token_store.dart';
import 'secure_storage_service.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    ref.watch(secureStorageServiceProvider),
    ref.watch(accessTokenStoreProvider),
  );
});

class ApiClient {
  ApiClient(this._storage, this._accessTokenStore, {Dio? dio, Dio? refreshDio})
    : _dio = dio ?? Dio(_baseOptions()),
      _refreshDio = refreshDio ?? Dio(_baseOptions()) {
    _dio.interceptors.add(
      InterceptorsWrapper(onRequest: _onRequest, onError: _onError),
    );
  }

  static const _retriedKey = 'driverhub_retried_after_refresh';
  static const _publicAuthPaths = {
    '/auth/register',
    '/auth/login',
    '/auth/refresh',
  };

  final SecureStorageService _storage;
  final AccessTokenStore _accessTokenStore;
  final Dio _dio;
  final Dio _refreshDio;
  Future<String?>? _refreshFuture;

  /// Stores a new session after a successful login (BR-13).
  Future<void> startSession({
    required String accessToken,
    required String refreshToken,
  }) async {
    _accessTokenStore.save(accessToken);
    await _storage.saveRefreshToken(refreshToken);
  }

  /// Restores the in-memory access token when the app starts again.
  Future<bool> restoreSession() async =>
      await _refreshAccessTokenSingleFlight() != null;

  Future<void> clearSession() => _clearSession();

  Future<void> logout() async {
    final refreshToken = await _storage.readRefreshToken();
    try {
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await post<Map<String, dynamic>>(
          '/auth/logout',
          data: {'refreshToken': refreshToken},
        );
      }
    } finally {
      await _clearSession();
    }
  }

  static BaseOptions _baseOptions() => BaseOptions(
    baseUrl: AppConfig.apiUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 20),
    sendTimeout: const Duration(seconds: 20),
    headers: const {'Accept': 'application/json'},
  );

  Future<void> _onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final accessToken = _accessTokenStore.token;
    if (!_publicAuthPaths.contains(options.path) &&
        accessToken != null &&
        accessToken.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }
    handler.next(options);
  }

  Future<void> _onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    final request = error.requestOptions;
    final shouldRefresh =
        error.response?.statusCode == 401 &&
        request.extra[_retriedKey] != true &&
        !_publicAuthPaths.contains(request.path);

    if (!shouldRefresh) {
      handler.next(error);
      return;
    }

    late final String? accessToken;
    try {
      accessToken = await _refreshAccessTokenSingleFlight();
      if (accessToken == null) {
        await _clearSession();
        handler.next(error);
        return;
      }
    } on DioException catch (refreshError) {
      await _clearSession();
      handler.reject(refreshError);
      return;
    } on Object catch (refreshError) {
      await _clearSession();
      handler.reject(error.copyWith(error: AppException.from(refreshError)));
      return;
    }

    try {
      final response = await _dio.fetch<dynamic>(
        request.copyWith(
          headers: {...request.headers, 'Authorization': 'Bearer $accessToken'},
          extra: {...request.extra, _retriedKey: true},
        ),
      );
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.reject(retryError);
    } on Object catch (retryError) {
      handler.reject(error.copyWith(error: AppException.from(retryError)));
    }
  }

  Future<String?> _refreshAccessTokenSingleFlight() {
    final runningRefresh = _refreshFuture;
    if (runningRefresh != null) return runningRefresh;

    // BR-13: one refresh-token rotation only; concurrent 401 requests wait here.
    final newRefresh = _performRefreshAndReset();
    _refreshFuture = newRefresh;
    return newRefresh;
  }

  Future<String?> _performRefreshAndReset() async {
    try {
      final refreshToken = await _storage.readRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) return null;

      final response = await _refreshDio.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final envelope = response.data;
      if (envelope == null || envelope['data'] is! Map) return null;

      final data = Map<String, dynamic>.from(envelope['data'] as Map);
      final accessToken = data['accessToken'] as String?;
      final rotatedRefreshToken = data['refreshToken'] as String?;
      if (accessToken == null || rotatedRefreshToken == null) return null;

      // BR-13: only the rotating refresh token is persisted securely.
      _accessTokenStore.save(accessToken);
      await _storage.saveRefreshToken(rotatedRefreshToken);
      return accessToken;
    } finally {
      _refreshFuture = null;
    }
  }

  Future<void> _clearSession() async {
    _accessTokenStore.clear();
    await _storage.clearRefreshToken();
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.get<T>(
        path,
        queryParameters: queryParameters,
        options: options,
      );
    } on Object catch (error) {
      throw AppException.from(error);
    }
  }

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on Object catch (error) {
      throw AppException.from(error);
    }
  }

  Future<Response<T>> patch<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.patch<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on Object catch (error) {
      throw AppException.from(error);
    }
  }

  Future<Response<T>> delete<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.delete<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on Object catch (error) {
      throw AppException.from(error);
    }
  }
}
