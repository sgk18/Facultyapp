import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/gradient_container.dart';
import '../../../core/widgets/glass_card.dart';
import '../../auth/presentation/auth_notifier.dart';
import '../../calendar/presentation/calendar_provider.dart';
import '../../deadlines/presentation/deadlines_provider.dart';
import '../../notifications/presentation/notifications_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  // Helper: check if date is today
  bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month && date.day == now.day;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final user = authState.user;
    final facultyName = user?.fullName ?? 'Faculty Member';

    // Watch states from providers
    final deadlinesState = ref.watch(deadlinesProvider);
    final notificationsState = ref.watch(notificationsProvider);
    final calendarState = ref.watch(calendarEventsProvider);

    // 1. Pending Tasks Count (uncompleted deadlines)
    final pendingCount = deadlinesState.maybeWhen(
      data: (list) => list.where((d) => !d.isCompleted).length,
      orElse: () => 0,
    );

    // 2. Classes/Events Today Count
    final eventsTodayCount = calendarState.maybeWhen(
      data: (list) => list.where((e) => _isToday(e.startTime)).length,
      orElse: () => 0,
    );

    // 3. New Alerts Count (unread notifications)
    final unreadAlertsCount = notificationsState.maybeWhen(
      data: (list) => list.where((n) => !n.isRead).length,
      orElse: () => 0,
    );

    // 4. Urgent Deadlines List (uncompleted, sorted by closest due date, max 3)
    final urgentDeadlines = deadlinesState.maybeWhen(
      data: (list) {
        final sorted = list.where((d) => !d.isCompleted).toList()
          ..sort((a, b) => a.dueDate.compareTo(b.dueDate));
        return sorted.take(3).toList();
      },
      orElse: () => <Deadline>[],
    );

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          // Re-fetch all data on pull down
          await Future.wait([
            ref.read(deadlinesProvider.notifier).fetchDeadlines(),
            ref.read(notificationsProvider.notifier).fetchNotifications(),
            ref.read(calendarEventsProvider.notifier).fetchCalendarEvents(),
          ]);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Welcome Header
              GradientContainer(
                padding: const EdgeInsets.only(top: 64, left: 24, right: 24, bottom: 32),
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(32),
                  bottomRight: Radius.circular(32),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Welcome back,',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.85),
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              facultyName,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        // Unread Notifications Badge
                        Badge(
                          label: Text('$unreadAlertsCount'),
                          isLabelVisible: unreadAlertsCount > 0,
                          backgroundColor: Colors.red,
                          textColor: Colors.white,
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                            ),
                            child: IconButton(
                              icon: const Icon(Icons.notifications_none_outlined, color: Colors.white),
                              onPressed: () => context.go('/notifications'),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    
                    // Live statistics row
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildHeaderStat('$pendingCount', 'Pending Tasks'),
                          Container(width: 1, height: 32, color: Colors.white30),
                          _buildHeaderStat('$eventsTodayCount', 'Events Today'),
                          Container(width: 1, height: 32, color: Colors.white30),
                          _buildHeaderStat('$unreadAlertsCount', 'New Alerts'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Quick Actions Grid
                    const Text(
                      'Quick Actions',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.darkBlue,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildQuickAction(Icons.add_task, 'Add Deadline', () {
                          context.go('/deadlines');
                        }),
                        _buildQuickAction(Icons.event, 'Add Schedule', () {
                          context.go('/calendar');
                        }),
                        _buildQuickAction(Icons.alarm_add, 'Add Reminder', () {
                          context.go('/calendar');
                        }),
                        _buildQuickAction(Icons.person_outline, 'Profile', () {
                          context.go('/profile');
                        }),
                      ],
                    ),
                    const SizedBox(height: 32),
                    
                    // Urgent Deadlines Title
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Urgent Deadlines',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.darkBlue,
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.go('/deadlines'),
                          child: const Text('View All'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    
                    // Urgent Deadlines list view
                    if (urgentDeadlines.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            children: [
                              Icon(Icons.check_circle_outline, size: 48, color: Colors.green.shade300),
                              const SizedBox(height: 12),
                              const Text(
                                'All clear! No urgent pending deadlines.',
                                style: TextStyle(color: Colors.black54, fontSize: 14),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      ...urgentDeadlines.map((deadline) {
                        final dateString = DateFormat('MMM dd, yyyy - hh:mm a').format(deadline.dueDate.toLocal());
                        final isOverdue = deadline.dueDate.isBefore(DateTime.now());
                        
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: InkWell(
                            onTap: () => context.go('/deadlines'),
                            child: GlassCard(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: isOverdue ? Colors.red.shade50 : Colors.amber.shade50,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Icon(
                                      isOverdue ? Icons.warning_amber_rounded : Icons.assignment_outlined,
                                      color: isOverdue ? Colors.red.shade600 : Colors.amber.shade700,
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          deadline.title,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 15,
                                            color: AppTheme.darkBlue,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Due by: $dateString',
                                          style: TextStyle(
                                            color: isOverdue ? Colors.red.shade600 : Colors.grey.shade600,
                                            fontSize: 13,
                                            fontWeight: isOverdue ? FontWeight.w600 : FontWeight.normal,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right, color: Colors.black26),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeaderStat(String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.75),
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickAction(IconData icon, String label, VoidCallback onTap) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: AppTheme.softShadow,
              border: Border.all(color: Colors.grey.shade100),
            ),
            child: Icon(icon, color: AppTheme.primary, size: 28),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: Colors.black87,
          ),
        ),
      ],
    );
  }
}
