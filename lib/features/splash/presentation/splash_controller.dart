import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../domain/splash_state.dart';
import '../application/session_loader.dart';
import '../application/auth_check_service.dart';
import '../../auth/presentation/auth_notifier.dart';

final splashFinishedProvider = StateProvider<bool>((ref) => false);

class SplashController extends StateNotifier<SplashState> {
  final Ref _ref;

  SplashController(this._ref) : super(SplashState.initial()) {
    initialize();
  }

  Future<void> initialize() async {
    state = SplashState.initial();
    _ref.read(splashFinishedProvider.notifier).state = false;

    final startTime = DateTime.now();

    try {
      // Phase 1: Checking Session ("Verifying your faculty account")
      state = state.copyWith(
        phase: SplashPhase.checkingSession,
        statusMessage: 'Verifying your faculty account',
        progress: 0.25,
      );

      // Smooth flow visual delay
      await Future.delayed(const Duration(milliseconds: 600));

      final sessionLoader = _ref.read(sessionLoaderProvider);
      final hasToken = await sessionLoader.loadToken() != null;
      final supabaseSession = await sessionLoader.getSupabaseSession();

      // If no local credentials or supabase session, proceed immediately to login route
      if (!hasToken && supabaseSession == null) {
        await _ensureMinimumDuration(startTime);
        state = state.copyWith(
          phase: SplashPhase.success,
          progress: 1.0,
          statusMessage: 'Session verified.',
        );
        _ref.read(splashFinishedProvider.notifier).state = true;
        return;
      }

      // Phase 2: Fetching User Profile ("Loading faculty workspace")
      state = state.copyWith(
        phase: SplashPhase.fetchingProfile,
        statusMessage: 'Loading faculty workspace',
        progress: 0.6,
      );

      await Future.delayed(const Duration(milliseconds: 600));

      // Wait for AuthNotifier loading session to complete (it runs automatically on start)
      int retries = 0;
      while (_ref.read(authNotifierProvider).isInitializing && retries < 15) {
        await Future.delayed(const Duration(milliseconds: 200));
        retries++;
      }

      final authState = _ref.read(authNotifierProvider);

      if (authState.errorMessage != null) {
        throw Exception(authState.errorMessage);
      }

      // If session exists but local authentication failed (e.g. token expired)
      if (!authState.isAuthenticated) {
        await _ensureMinimumDuration(startTime);
        state = state.copyWith(
          phase: SplashPhase.success,
          progress: 1.0,
          statusMessage: 'Access expired. Please sign in again.',
        );
        _ref.read(splashFinishedProvider.notifier).state = true;
        return;
      }

      final user = authState.user;
      if (user == null) {
        throw Exception('Faculty profile record not found.');
      }

      // Phase 3: Checking Onboarding ("Preparing your dashboard")
      state = state.copyWith(
        phase: SplashPhase.checkingOnboarding,
        statusMessage: 'Preparing your dashboard',
        progress: 0.85,
      );

      await Future.delayed(const Duration(milliseconds: 600));

      // Ensure minimum display duration of 1.5 seconds is satisfied
      await _ensureMinimumDuration(startTime);

      state = state.copyWith(
        phase: SplashPhase.success,
        progress: 1.0,
        statusMessage: 'Workspace prepared.',
      );

      // Trigger GoRouter refresh
      _ref.read(splashFinishedProvider.notifier).state = true;

    } catch (e) {
      state = state.copyWith(
        phase: SplashPhase.error,
        statusMessage: 'Unable to load account',
        errorMessage: e.toString().replaceAll('Exception:', '').trim(),
        progress: 1.0,
      );
    }
  }

  Future<void> _ensureMinimumDuration(DateTime startTime) async {
    final elapsed = DateTime.now().difference(startTime);
    const minDuration = Duration(milliseconds: 1500);
    if (elapsed < minDuration) {
      await Future.delayed(minDuration - elapsed);
    }
  }
}

final splashControllerProvider = StateNotifierProvider<SplashController, SplashState>((ref) {
  return SplashController(ref);
});
