import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../domain/user_model.dart';
import '../domain/auth_state.dart';

class AuthNotifierState {
  final bool isInitializing;
  final UserModel? user;
  final String? token;
  final String? errorMessage;

  AuthNotifierState({
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

  AuthNotifierState copyWith({
    bool? isInitializing,
    UserModel? user,
    String? token,
    String? errorMessage,
  }) {
    return AuthNotifierState(
      isInitializing: isInitializing ?? this.isInitializing,
      user: user ?? this.user,
      token: token ?? this.token,
      errorMessage: errorMessage ?? this.errorMessage,
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
        await _onboardToken(token);
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
      final message = e.response?.data['error'] ?? 'Access restricted. Authentication failed.';
      state = state.copyWith(
        errorMessage: message is List ? message.first : message.toString(),
      );
      await secureStorage.delete(key: AppConstants.tokenKey);
      await secureStorage.delete(key: AppConstants.userKey);
      await Supabase.instance.client.auth.signOut();
      return false;
    } catch (e) {
      state = state.copyWith(errorMessage: 'An unexpected authentication error occurred.');
      await secureStorage.delete(key: AppConstants.tokenKey);
      await secureStorage.delete(key: AppConstants.userKey);
      await Supabase.instance.client.auth.signOut();
      return false;
    }
  }

  Future<void> signInWithGoogle() async {
    state = state.copyWith(errorMessage: null);
    try {
      await Supabase.instance.client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'facultyapp://auth/callback',
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
