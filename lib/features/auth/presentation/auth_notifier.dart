import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';
import '../domain/user_model.dart';

class AuthState {
  final bool isInitializing;
  final UserModel? user;
  final String? token;
  final String? errorMessage;

  AuthState({
    this.isInitializing = true,
    this.user,
    this.token,
    this.errorMessage,
  });

  bool get isAuthenticated => user != null && token != null;

  AuthState copyWith({
    bool? isInitializing,
    UserModel? user,
    String? token,
    String? errorMessage,
  }) {
    return AuthState(
      isInitializing: isInitializing ?? this.isInitializing,
      user: user ?? this.user,
      token: token ?? this.token,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> with ChangeNotifier {
  final Ref _ref;

  AuthNotifier(this._ref) : super(AuthState()) {
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
        state = AuthState(
          isInitializing: false,
          token: token,
          user: UserModel.fromJson(userData),
        );
      } else {
        state = AuthState(isInitializing: false);
      }
    } catch (e) {
      state = AuthState(isInitializing: false);
    }
    notifyListeners();
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
    try {
      final secureStorage = _ref.read(secureStorageProvider);
      await secureStorage.write(key: AppConstants.tokenKey, value: token);

      final response = await _ref.read(dioProvider).post(
        '/auth/onboard',
      );

      final userMap = response.data['data'] as Map<String, dynamic>;
      final user = UserModel.fromJson(userMap);

      await secureStorage.write(key: AppConstants.userKey, value: jsonEncode(userMap));

      state = AuthState(
        isInitializing: false,
        token: token,
        user: user,
      );
      notifyListeners();
      return true;
    } on DioException catch (e) {
      final message = e.response?.data['error'] ?? 'Access restricted. Authentication failed.';
      state = state.copyWith(
        errorMessage: message is List ? message.first : message.toString(),
      );
      await Supabase.instance.client.auth.signOut();
      return false;
    } catch (e) {
      state = state.copyWith(errorMessage: 'An unexpected authentication error occurred.');
      await Supabase.instance.client.auth.signOut();
      return false;
    }
  }

  Future<void> signInWithGoogle() async {
    state = state.copyWith(errorMessage: null);
    try {
      await Supabase.instance.client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'facultyapp://login-callback',
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

    state = AuthState(isInitializing: false);
    notifyListeners();
  }
}

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});
