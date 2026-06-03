import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/network/api_client.dart';

class SessionLoader {
  final Ref _ref;

  SessionLoader(this._ref);

  Future<String?> loadToken() async {
    final secureStorage = _ref.read(secureStorageProvider);
    return await secureStorage.read(key: AppConstants.tokenKey);
  }

  Future<Session?> getSupabaseSession() async {
    try {
      return Supabase.instance.client.auth.currentSession;
    } catch (_) {
      return null;
    }
  }
}

final sessionLoaderProvider = Provider<SessionLoader>((ref) {
  return SessionLoader(ref);
});
