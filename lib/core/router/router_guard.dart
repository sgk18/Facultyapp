import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/domain/auth_state.dart';

class RouterGuard {
  static String? redirect(BuildContext context, GoRouterState state, AppAuthState authState, bool splashFinished) {
    final matchedLocation = state.matchedLocation;
    final isSplash = matchedLocation == '/splash';
    final isLogin = matchedLocation == '/login';
    final isAuthCallback = matchedLocation == '/auth/callback';
    final isProfile = matchedLocation == '/profile';

    debugPrint('[RouterGuard] Redirect Check | Route: $matchedLocation | State: $authState | SplashFinished: $splashFinished');

    // 1. Keep user on splash screen until splash controller completes
    if (!splashFinished) {
      final target = isSplash ? null : '/splash';
      if (target != null) {
        debugPrint('[RouterGuard] Splash not finished. Redirecting: $matchedLocation -> $target');
      }
      return target;
    }

    // 2. Once splash finishes, route based on AuthState
    switch (authState) {
      case AppAuthState.loading:
        final target = isSplash ? null : '/splash';
        if (target != null) {
          debugPrint('[RouterGuard] AuthState loading. Redirecting: $matchedLocation -> $target');
        }
        return target;

      case AppAuthState.unauthenticated:
        if (isLogin || isAuthCallback) {
          return null;
        }
        debugPrint('[RouterGuard] Unauthenticated. Redirecting: $matchedLocation -> /login');
        return '/login';

      case AppAuthState.onboarding:
        if (isProfile) {
          return null;
        }
        debugPrint('[RouterGuard] Onboarding incomplete. Redirecting: $matchedLocation -> /profile');
        return '/profile';

      case AppAuthState.authenticated:
        if (isLogin || isSplash || isAuthCallback) {
          debugPrint('[RouterGuard] Authenticated. Redirecting: $matchedLocation -> /dashboard');
          return '/dashboard';
        }
        return null;
    }
  }
}
