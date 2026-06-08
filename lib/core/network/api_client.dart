import 'package:dio/dio.dart' as dio;
import 'package:dio/dio.dart' show Dio, DioException, BaseOptions, InterceptorsWrapper, RequestOptions, Response;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../constants/app_constants.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      contentType: dio.Headers.jsonContentType,
    ),
  );

  final secureStorage = ref.watch(secureStorageProvider);

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await secureStorage.read(key: AppConstants.tokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException error, handler) async {
        final response = error.response;
        final options = error.requestOptions;

        // Only attempt a single silent refresh on 401 responses.
        // The '_retried' extra flag prevents an infinite retry loop.
        if (response?.statusCode == 401 &&
            options.extra['_retried'] != true) {
          try {
            // Ask Supabase to silently refresh the session
            final refreshResult =
                await Supabase.instance.client.auth.refreshSession();
            final newToken = refreshResult.session?.accessToken;

            if (newToken != null) {
              // Persist the fresh token
              await secureStorage.write(
                key: AppConstants.tokenKey,
                value: newToken,
              );

              // Retry the original request with the new token
              options.headers['Authorization'] = 'Bearer $newToken';
              options.extra['_retried'] = true;

              final retryResponse = await dio.fetch(options);
              return handler.resolve(retryResponse);
            }
          } catch (_) {
            // Refresh failed — clear stale storage and fall through to error
            await secureStorage.delete(key: AppConstants.tokenKey);
            await secureStorage.delete(key: AppConstants.userKey);
          }
        }

        return handler.next(error);
      },
    ),
  );

  return dio;
});

class ApiClient {
  final Dio _dio;

  ApiClient(this._dio);

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } on DioException {
      rethrow;
    }
  }

  Future<Response> post(String path, {dynamic data}) async {
    try {
      return await _dio.post(path, data: data);
    } on DioException {
      rethrow;
    }
  }

  Future<Response> put(String path, {dynamic data}) async {
    try {
      return await _dio.put(path, data: data);
    } on DioException {
      rethrow;
    }
  }

  Future<Response> delete(String path, {dynamic data}) async {
    try {
      return await _dio.delete(path, data: data);
    } on DioException {
      rethrow;
    }
  }

  Future<Response> patch(String path, {dynamic data}) async {
    try {
      return await _dio.patch(path, data: data);
    } on DioException {
      rethrow;
    }
  }
}

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(dioProvider));
});
