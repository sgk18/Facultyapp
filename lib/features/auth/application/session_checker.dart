import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/app_constants.dart';

class SessionChecker {
  final Ref _ref;

  SessionChecker(this._ref);

  Future<bool> hasValidSession() async {
    try {
      final secureStorage = _ref.read(secureStorageProvider);
      final token = await secureStorage.read(key: AppConstants.tokenKey);
      final supabaseSession = Supabase.instance.client.auth.currentSession;
      return token != null && supabaseSession != null;
    } catch (_) {
      return false;
    }
  }
}

final sessionCheckerProvider = Provider<SessionChecker>((ref) {
  return SessionChecker(ref);
});
