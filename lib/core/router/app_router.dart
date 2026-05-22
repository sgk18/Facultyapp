import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../../features/auth/presentation/auth_notifier.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/deadlines/presentation/deadlines_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/calendar/presentation/calendar_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/navigation/presentation/main_scaffold.dart';
import '../../features/splash/presentation/splash_screen.dart';

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
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final listenable = RouterListenable(ref);

  return GoRouter(
    navigatorKey: navigatorKey,
    initialLocation: '/splash',
    refreshListenable: listenable,
    redirect: (context, state) {
      final authState = ref.read(authNotifierProvider);
      
      final isLoggingIn = state.matchedLocation == '/login';
      final isSplash = state.matchedLocation == '/splash';
      
      final isAuthenticated = authState.isAuthenticated;
      final isInitializing = authState.isInitializing;

      if (isInitializing) {
        return isSplash ? null : '/splash';
      }

      if (!isAuthenticated) {
        return isLoggingIn ? null : '/login';
      }

      if (isLoggingIn || isSplash) {
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
