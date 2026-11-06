import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_exception.dart';
import '../../../data/models/auth_models.dart';
import '../../../data/repositories/auth_repository.dart';

enum AuthStatus { loading, unauthenticated, approved, pendingApproval }

class AuthState {
  const AuthState({
    required this.status,
    this.profile,
    this.isSubmitting = false,
    this.error,
  });

  const AuthState.loading() : this(status: AuthStatus.loading);

  final AuthStatus status;
  final AuthProfileModel? profile;
  final bool isSubmitting;
  final AppException? error;

  AuthState copyWith({
    AuthStatus? status,
    AuthProfileModel? profile,
    bool? isSubmitting,
    AppException? error,
    bool clearError = false,
  }) => AuthState(
    status: status ?? this.status,
    profile: profile ?? this.profile,
    isSubmitting: isSubmitting ?? this.isSubmitting,
    error: clearError ? null : (error ?? this.error),
  );
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) {
    return AuthController(ref.watch(authRepositoryProvider));
  },
);

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repository) : super(const AuthState.loading()) {
    restoreSession();
  }

  final AuthRepository _repository;

  Future<void> restoreSession() async {
    try {
      final profile = await _repository.restoreProfile();
      state = profile == null
          ? const AuthState(status: AuthStatus.unauthenticated)
          : _authenticatedState(profile);
    } on Object {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> login({required String email, required String password}) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final session = await _repository.login(email: email, password: password);
      state = _authenticatedState(
        AuthProfileModel(user: session.user, driver: session.driver),
      );
    } on Object catch (error) {
      state = state.copyWith(
        isSubmitting: false,
        error: AppException.from(error),
      );
    }
  }

  Future<void> logout() async {
    try {
      await _repository.logout();
      state = const AuthState(status: AuthStatus.unauthenticated);
    } on Object catch (error) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        error: AppException.from(error),
      );
    }
  }

  AuthState _authenticatedState(AuthProfileModel profile) {
    final approvalStatus = profile.driver?.approvalStatus;
    return AuthState(
      status: approvalStatus == 'APPROVED'
          ? AuthStatus.approved
          : AuthStatus.pendingApproval,
      profile: profile,
    );
  }
}
