import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../domain/user_model.dart';
import '../domain/auth_state.dart';
import '../../splash/presentation/splash_controller.dart';

/// Sentinel used to distinguish "not provided" from an explicit `null` in copyWith.
const _absent = Object();

class AuthNotifierState {
  final bool isInitializing;
  final UserModel? user;
  final String? token;
  final String? errorMessage;

  const AuthNotifierState({
    this.isInitializing = true,
    this.user,
    this.token,
    this.errorMessage,
  });

  bool get isAuthenticated => user != null && token != null;

  AppAuthState get authState {
    if (isInitializing) {
      return AppAuthState.loading;
    }
    if (user == null || token == null) {
      return AppAuthState.unauthenticated;
    }
    // Check onboarding status (profile setup)
    // If departmentId is null or empty, onboarding is considered incomplete
    if (user?.departmentId == null || user!.departmentId!.isEmpty) {
      return AppAuthState.onboarding;
    }
    return AppAuthState.authenticated;
  }

  /// Supports explicit null-clearing via sentinel:
  ///   `state.copyWith(user: null)` → clears user to null
  ///   `state.copyWith()`          → keeps existing user
  AuthNotifierState copyWith({
    bool? isInitializing,
    Object? user = _absent,
    Object? token = _absent,
    Object? errorMessage = _absent,
  }) {
    return AuthNotifierState(
      isInitializing: isInitializing ?? this.isInitializing,
      user: identical(user, _absent) ? this.user : user as UserModel?,
      token: identical(token, _absent) ? this.token : token as String?,
      errorMessage: identical(errorMessage, _absent)
          ? this.errorMessage
          : errorMessage as String?,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthNotifierState> {
  final Ref _ref;

  AuthNotifier(this._ref) : super(AuthNotifierState()) {
    _loadSession();
    _listenToAuthChanges();
  }

  Future<void> _loadSession() async {
    final secureStorage = _ref.read(secureStorageProvider);
    try {
      final token = await secureStorage.read(key: AppConstants.tokenKey);
      final userDataStr = await secureStorage.read(key: AppConstants.userKey);

      if (token != null && userDataStr != null) {
        final userData = jsonDecode(userDataStr) as Map<String, dynamic>;
        state = AuthNotifierState(
          isInitializing: false,
          token: token,
          user: UserModel.fromJson(userData),
        );
      } else {
        state = AuthNotifierState(isInitializing: false);
      }
    } catch (e) {
      state = AuthNotifierState(isInitializing: false);
    }
  }

  void _listenToAuthChanges() {
    Supabase.instance.client.auth.onAuthStateChange.listen((data) async {
      final session = data.session;
      if (session != null) {
        final token = session.accessToken;
        final success = await _onboardToken(token);
        if (success) {
          _ref.read(splashFinishedProvider.notifier).state = false;
          _ref.read(splashControllerProvider.notifier).initialize();
        }
      } else {
        // Suppress initial empty notifications during loading to avoid redirect loops
        if (state.token != null) {
          await logout();
        }
      }
    });
  }

  Future<bool> _onboardToken(String token) async {
    state = state.copyWith(errorMessage: null);
    final secureStorage = _ref.read(secureStorageProvider);
    try {
      await secureStorage.write(key: AppConstants.tokenKey, value: token);

      final response = await _ref.read(dioProvider).post(
        '/auth/onboard',
      );

      final userMap = response.data['data'] as Map<String, dynamic>;
      final user = UserModel.fromJson(userMap);

      await secureStorage.write(key: AppConstants.userKey, value: jsonEncode(userMap));

      state = AuthNotifierState(
        isInitializing: false,
        token: token,
        user: user,
      );
      return true;
    } on DioException catch (e) {
      final statusCode = e.response?.statusCode;

      // 401 → try a silent token refresh once before giving up
      if (statusCode == 401) {
        final refreshed = await _tryRefreshToken();
        if (refreshed != null) {
          return _onboardToken(refreshed);
        }
      }

      final rawMessage = e.response?.data['error'];
      final message = rawMessage is List
          ? rawMessage.first as String
          : (rawMessage?.toString() ?? 'Access restricted. Authentication failed.');

      // Clear stale credentials alongside the error message
      await secureStorage.delete(key: AppConstants.tokenKey);
      await secureStorage.delete(key: AppConstants.userKey);
      await Supabase.instance.client.auth.signOut();
      state = AuthNotifierState(
        isInitializing: false,
        errorMessage: message,
      );
      return false;
    } catch (e) {
      await secureStorage.delete(key: AppConstants.tokenKey);
      await secureStorage.delete(key: AppConstants.userKey);
      await Supabase.instance.client.auth.signOut();
      state = AuthNotifierState(
        isInitializing: false,
        errorMessage: 'An unexpected authentication error occurred.',
      );
      return false;
    }
  }

  /// Attempts a silent Supabase session refresh.
  /// Returns the new access token on success, or null if refresh failed.
  Future<String?> _tryRefreshToken() async {
    try {
      final response = await Supabase.instance.client.auth.refreshSession();
      final newToken = response.session?.accessToken;
      if (newToken != null) {
        final secureStorage = _ref.read(secureStorageProvider);
        await secureStorage.write(key: AppConstants.tokenKey, value: newToken);
        return newToken;
      }
    } catch (_) {
      // Refresh failed — fall through and let the caller handle logout
    }
    return null;
  }

  Future<void> signInWithGoogle() async {
    state = state.copyWith(errorMessage: null);
    try {
      await Supabase.instance.client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: kIsWeb ? 'http://localhost:8080' : 'facultyapp://auth/callback',
      );
    } catch (e) {
      state = state.copyWith(errorMessage: 'Google Sign-In failed to initialize.');
    }
  }

  Future<void> logout() async {
    final secureStorage = _ref.read(secureStorageProvider);
    await secureStorage.delete(key: AppConstants.tokenKey);
    await secureStorage.delete(key: AppConstants.userKey);

    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {}

    state = AuthNotifierState(isInitializing: false);
  }
}

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthNotifierState>((ref) {
  return AuthNotifier(ref);
});
