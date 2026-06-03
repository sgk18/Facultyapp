import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class MainScaffold extends StatelessWidget {
  final Widget child;

  const MainScaffold({
    super.key,
    required this.child,
  });

  int _calculateSelectedIndex(BuildContext context) {
    final String location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/dashboard')) return 0;
    if (location.startsWith('/deadlines')) return 1;
    if (location.startsWith('/calendar')) return 2;
    if (location.startsWith('/notifications')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/dashboard');
        break;
      case 1:
        context.go('/deadlines');
        break;
      case 2:
        context.go('/calendar');
        break;
      case 3:
        context.go('/notifications');
        break;
      case 4:
        context.go('/profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _calculateSelectedIndex(context);

    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: NavigationBar(
          selectedIndex: selectedIndex,
          onDestinationSelected: (index) => _onItemTapped(index, context),
          backgroundColor: Colors.white,
          indicatorColor: AppTheme.primary.withValues(alpha: 0.1),
          height: 72,
          elevation: 0,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard, color: AppTheme.primary),
              label: 'Dashboard',
            ),
            NavigationDestination(
              icon: Icon(Icons.assignment_outlined),
              selectedIcon: Icon(Icons.assignment, color: AppTheme.primary),
              label: 'Deadlines',
            ),
            NavigationDestination(
              icon: Icon(Icons.calendar_month_outlined),
              selectedIcon: Icon(Icons.calendar_month, color: AppTheme.primary),
              label: 'Calendar',
            ),
            NavigationDestination(
              icon: Icon(Icons.notifications_none_outlined),
              selectedIcon: Icon(Icons.notifications, color: AppTheme.primary),
              label: 'Alerts',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person, color: AppTheme.primary),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
