import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../../features/auth/presentation/auth_notifier.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/auth_callback_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/deadlines/presentation/deadlines_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/calendar/presentation/calendar_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/navigation/presentation/main_scaffold.dart';
import '../../features/splash/presentation/splash_screen.dart';

import '../../features/splash/presentation/splash_controller.dart';
import '../../features/profile/presentation/google_sync_provider.dart';
import 'router_guard.dart';

final navigatorKey = GlobalKey<NavigatorState>();

class RouterListenable extends ChangeNotifier {
  final Ref _ref;

  RouterListenable(this._ref) {
    _ref.listen(
      authNotifierProvider,
      (previous, next) {
        notifyListeners();
      },
    );
    _ref.listen(
      splashFinishedProvider,
      (previous, next) {
        notifyListeners();
      },
    );
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final listenable = RouterListenable(ref);

  return GoRouter(
    navigatorKey: navigatorKey,
    initialLocation: '/splash',
    refreshListenable: listenable,
    errorBuilder: (context, state) {
      final uri = state.uri;

      // Google auth callback → return to app deep link
      if (uri.scheme == 'facultyapp' && uri.host == 'google' && uri.path.startsWith('/callback')) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          // Refresh sync state so profile shows "Connected"
          ref.invalidate(googleSyncProvider);
          context.go('/profile');
        });
        return const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        );
      }

      // Supabase auth callback
      if ((uri.scheme == 'facultyapp' && uri.host == 'auth' && uri.path == '/callback') ||
          (uri.scheme == 'facultyapp' && uri.host == 'login-callback')) {
        final newPath = Uri(
          path: '/auth/callback',
          queryParameters: uri.queryParameters.isEmpty ? null : uri.queryParameters,
          fragment: uri.fragment.isEmpty ? null : uri.fragment,
        ).toString();
        
        WidgetsBinding.instance.addPostFrameCallback((_) {
          context.go(newPath);
        });
        return const Scaffold(
          body: Center(
            child: CircularProgressIndicator(),
          ),
        );
      }
      
      return Scaffold(
        body: Center(
          child: Text('Page not found: ${state.error}'),
        ),
      );
    },
    redirect: (context, state) {
      final authNotifierState = ref.read(authNotifierProvider);
      final splashFinished = ref.read(splashFinishedProvider);
      return RouterGuard.redirect(
        context,
        state,
        authNotifierState.authState,
        splashFinished,
      );
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/auth/callback',
        builder: (context, state) {
          final code = state.uri.queryParameters['code'];
          return AuthCallbackScreen(code: code);
        },
      ),
      ShellRoute(
        builder: (context, state, child) {
          return MainScaffold(child: child);
        },
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/deadlines',
            builder: (context, state) => const DeadlinesScreen(),
          ),
          GoRoute(
            path: '/calendar',
            builder: (context, state) => const CalendarScreen(),
          ),
          GoRoute(
            path: '/notifications',
            builder: (context, state) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
});
