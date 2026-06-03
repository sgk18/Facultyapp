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
      final authState = ref.read(authNotifierProvider);
      final splashFinished = ref.read(splashFinishedProvider);
      
      final isLoggingIn = state.matchedLocation == '/login';
      final isSplash = state.matchedLocation == '/splash';
      final isAuthCallback = state.matchedLocation == '/auth/callback';
      
      final isAuthenticated = authState.isAuthenticated;
      final isInitializing = authState.isInitializing;

      // Keep user on splash screen until splash controller completes
      if (!isSplash && !splashFinished) {
        return '/splash';
      }

      if (isInitializing) {
        return isSplash ? null : '/splash';
      }

      if (!isAuthenticated) {
        return (isLoggingIn || isAuthCallback) ? null : '/login';
      }

      // Check onboarding status (profile setup)
      // If departmentId is null, we treat it as onboarding incomplete and redirect to /profile
      final onboardingIncomplete = authState.user?.departmentId == null;

      if (onboardingIncomplete) {
        return state.matchedLocation == '/profile' ? null : '/profile';
      }

      if (isLoggingIn || isSplash || isAuthCallback) {
        return '/dashboard';
      }

      return null;
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
