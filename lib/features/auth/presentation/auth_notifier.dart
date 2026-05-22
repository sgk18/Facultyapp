import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

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

  Future<bool> login(String email, String password) async {
    state = state.copyWith(errorMessage: null);
    try {
      final response = await _ref.read(dioProvider).post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
        },
      );

      final token = response.data['accessToken'] as String;
      final userMap = response.data['user'] as Map<String, dynamic>;
      final user = UserModel.fromJson(userMap);

      final secureStorage = _ref.read(secureStorageProvider);
      await secureStorage.write(key: AppConstants.tokenKey, value: token);
      await secureStorage.write(key: AppConstants.userKey, value: jsonEncode(userMap));

      state = AuthState(
        isInitializing: false,
        token: token,
        user: user,
      );
      notifyListeners();
      return true;
    } on DioException catch (e) {
      final message = e.response?.data['message'] ?? 'Login failed. Please try again.';
      state = state.copyWith(
        errorMessage: message is List ? message.first : message.toString(),
      );
      return false;
    } catch (e) {
      state = state.copyWith(errorMessage: 'An unexpected error occurred.');
      return false;
    }
  }

  Future<void> logout() async {
    final secureStorage = _ref.read(secureStorageProvider);
    await secureStorage.delete(key: AppConstants.tokenKey);
    await secureStorage.delete(key: AppConstants.userKey);
    state = AuthState(isInitializing: false);
    notifyListeners();
  }
}

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});
