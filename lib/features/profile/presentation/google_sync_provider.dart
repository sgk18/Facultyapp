import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../core/network/api_client.dart';

class GoogleConsentState {
  final bool isLoading;
  final bool connected;
  final bool syncGmail;
  final bool syncCalendar;
  final String? errorMessage;

  GoogleConsentState({
    this.isLoading = false,
    this.connected = false,
    this.syncGmail = false,
    this.syncCalendar = false,
    this.errorMessage,
  });

  GoogleConsentState copyWith({
    bool? isLoading,
    bool? connected,
    bool? syncGmail,
    bool? syncCalendar,
    String? errorMessage,
  }) {
    return GoogleConsentState(
      isLoading: isLoading ?? this.isLoading,
      connected: connected ?? this.connected,
      syncGmail: syncGmail ?? this.syncGmail,
      syncCalendar: syncCalendar ?? this.syncCalendar,
      errorMessage: errorMessage,
    );
  }
}

class GoogleSyncNotifier extends StateNotifier<GoogleConsentState> {
  final Ref _ref;

  GoogleSyncNotifier(this._ref) : super(GoogleConsentState()) {
    fetchConsentStatus();
  }

  Future<void> fetchConsentStatus() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _ref.read(apiClientProvider).get('/auth/google/consent');
      final data = response.data['data'] as Map<String, dynamic>;
      
      state = GoogleConsentState(
        isLoading: false,
        connected: data['connected'] ?? false,
        syncGmail: data['syncGmail'] ?? false,
        syncCalendar: data['syncCalendar'] ?? false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to retrieve Google sync status.',
      );
    }
  }

  Future<void> updateConsentSettings({
    required bool syncGmail,
    required bool syncCalendar,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _ref.read(apiClientProvider).post(
        '/auth/google/consent',
        data: {
          'syncGmail': syncGmail,
          'syncCalendar': syncCalendar,
        },
      );
      final data = response.data['data'] as Map<String, dynamic>;
      
      state = state.copyWith(
        isLoading: false,
        syncGmail: data['syncGmail'] ?? false,
        syncCalendar: data['syncCalendar'] ?? false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to update Google sync options.',
      );
    }
  }

  Future<void> disconnect() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _ref.read(apiClientProvider).delete('/auth/google/consent');
      state = GoogleConsentState(isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to disconnect Google account.',
      );
    }
  }
}

final googleSyncProvider = StateNotifierProvider<GoogleSyncNotifier, GoogleConsentState>((ref) {
  return GoogleSyncNotifier(ref);
});
