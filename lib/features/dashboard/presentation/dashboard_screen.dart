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
import '../../reminders/presentation/reminders_provider.dart';

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
    final remindersState = ref.watch(remindersProvider);

    // 1. Pending Tasks Count (uncompleted deadlines)
    final pendingCount = deadlinesState.maybeWhen(
      data: (list) => list.where((d) => !d.isCompleted).length,
      orElse: () => 0,
    );

    // 2. Classes/Events Today Count
    final eventsToday = calendarState.maybeWhen(
      data: (list) => list.where((e) => _isToday(e.startTime)).toList(),
      orElse: () => <CalendarEvent>[],
    );
    final eventsTodayCount = eventsToday.length;

    // 3. New Reminders Count
    final activeReminders = remindersState.maybeWhen(
      data: (list) => list.where((r) => r.status == 'PENDING').toList(),
      orElse: () => <Reminder>[],
    );
    final remindersCount = activeReminders.length;

    // 4. New Alerts Count (unread notifications)
    final unreadAlertsCount = notificationsState.maybeWhen(
      data: (list) => list.where((n) => !n.isRead).length,
      orElse: () => 0,
    );

    // 5. Urgent Deadlines List (uncompleted, sorted by closest due date, max 3)
    final urgentDeadlines = deadlinesState.maybeWhen(
      data: (list) {
        final sorted = list.where((d) => !d.isCompleted).toList()
          ..sort((a, b) => a.dueDate.compareTo(b.dueDate));
        return sorted.take(3).toList();
      },
      orElse: () => <Deadline>[],
    );

    // Dynamic greeting based on time of day
    final hour = DateTime.now().hour;
    final String greeting;
    if (hour < 12) {
      greeting = 'Good Morning,';
    } else if (hour < 17) {
      greeting = 'Good Afternoon,';
    } else {
      greeting = 'Good Evening,';
    }

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          // Re-fetch all data on pull down
          await Future.wait([
            ref.read(deadlinesProvider.notifier).fetchDeadlines(),
            ref.read(notificationsProvider.notifier).fetchNotifications(),
            ref.read(calendarEventsProvider.notifier).fetchCalendarEvents(),
            ref.read(remindersProvider.notifier).fetchReminders(),
          ]);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Welcome Header
              Stack(
                clipBehavior: Clip.none,
                children: [
                  GradientContainer(
                    padding: const EdgeInsets.only(top: 64, left: 24, right: 24, bottom: 60),
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
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    greeting,
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.85),
                                      fontSize: 16,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    facultyName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Stay productive and keep up the great work!',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.85),
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
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
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                  
                  // Floating stats card overlap
                  Positioned(
                    bottom: -50,
                    left: 24,
                    right: 24,
                    child: GlassCard(
                      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                      backgroundColor: Colors.white,
                      child: Row(
                        children: [
                          _buildStatItem(
                            value: '$pendingCount',
                            label: 'Pending Tasks',
                            icon: Icons.assignment_outlined,
                            iconColor: Colors.blue.shade700,
                            iconBgColor: Colors.blue.shade50,
                          ),
                          _buildStatItem(
                            value: '$eventsTodayCount',
                            label: 'Events Today',
                            icon: Icons.calendar_today_outlined,
                            iconColor: Colors.green.shade700,
                            iconBgColor: Colors.green.shade50,
                          ),
                          _buildStatItem(
                            value: '$remindersCount',
                            label: 'New Reminders',
                            icon: Icons.alarm,
                            iconColor: Colors.orange.shade700,
                            iconBgColor: Colors.orange.shade50,
                          ),
                          _buildStatItem(
                            value: '$unreadAlertsCount',
                            label: 'New Alerts',
                            icon: Icons.notifications_none_outlined,
                            iconColor: Colors.purple.shade700,
                            iconBgColor: Colors.purple.shade50,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 66), // space for overlapping stats card
              
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Quick Actions Title Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Quick Actions',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.darkBlue,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () {},
                          label: const Text(
                            'Customize',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.primary),
                          ),
                          icon: const Icon(Icons.settings_outlined, size: 16, color: AppTheme.primary),
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Quick Actions Grid Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildQuickAction(
                          icon: Icons.add_circle_outline,
                          label: 'Add Deadline',
                          color: Colors.blue.shade600,
                          onTap: () => context.go('/deadlines'),
                        ),
                        _buildQuickAction(
                          icon: Icons.calendar_today_outlined,
                          label: 'Add Schedule',
                          color: Colors.green.shade600,
                          onTap: () => context.go('/calendar'),
                        ),
                        _buildQuickAction(
                          icon: Icons.alarm_add_outlined,
                          label: 'Add Reminder',
                          color: Colors.orange.shade600,
                          onTap: () => context.go('/calendar'),
                        ),
                        _buildQuickAction(
                          icon: Icons.person_outline,
                          label: 'Profile',
                          color: Colors.purple.shade600,
                          onTap: () => context.go('/profile'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    
                    // Urgent Deadlines Title Row
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
                        TextButton.icon(
                          onPressed: () => context.go('/deadlines'),
                          label: const Text(
                            'View All',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.primary),
                          ),
                          icon: const Icon(Icons.chevron_right, size: 16, color: AppTheme.primary),
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    
                    // Urgent Deadlines List / Empty state
                    if (urgentDeadlines.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.green.shade100, width: 1),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.check_circle_outline, size: 36, color: Colors.green.shade500),
                            const SizedBox(height: 12),
                            const Text(
                              'All clear!',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.green,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'No urgent pending deadlines.',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.black54,
                              ),
                            ),
                          ],
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

                    // Today's Schedule Title Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Today's Schedule",
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.darkBlue,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () => context.go('/calendar'),
                          label: const Text(
                            'View Calendar',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.primary),
                          ),
                          icon: const Icon(Icons.calendar_month_outlined, size: 16, color: AppTheme.primary),
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Today's Schedule Card / Empty State
                    if (eventsToday.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Colors.grey.shade200,
                            style: BorderStyle.solid,
                          ),
                          boxShadow: AppTheme.softShadow,
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade50,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(Icons.calendar_today_outlined, color: Colors.blue.shade500, size: 28),
                            ),
                            const SizedBox(width: 16),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'No events for today',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                      color: AppTheme.darkBlue,
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Enjoy your free time or plan something new!',
                                    style: TextStyle(
                                      color: Colors.grey,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ...eventsToday.map((event) {
                        final timeString = DateFormat('hh:mm a').format(event.startTime.toLocal());
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: GlassCard(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.green.shade50,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(Icons.school_outlined, color: Colors.green.shade600),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        event.title,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                          color: AppTheme.darkBlue,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        event.description ?? 'Academic Event',
                                        style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        timeString,
                                        style: const TextStyle(color: Colors.black45, fontSize: 11),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),

                    const SizedBox(height: 24),

                    // Recent Reminders Title Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Recent Reminders',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.darkBlue,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () => context.go('/calendar'),
                          label: const Text(
                            'View All',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.primary),
                          ),
                          icon: const Icon(Icons.chevron_right, size: 16, color: AppTheme.primary),
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Recent Reminders List / Empty State
                    if (activeReminders.isEmpty)
                      InkWell(
                        onTap: () => context.go('/calendar'),
                        child: GlassCard(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.blue.shade50,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(Icons.notifications_none, color: Colors.blue.shade500),
                              ),
                              const SizedBox(width: 16),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'No reminders yet',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                        color: AppTheme.darkBlue,
                                      ),
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      "You're all caught up!",
                                      style: TextStyle(
                                        color: Colors.grey,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(Icons.chevron_right, color: Colors.black26),
                            ],
                          ),
                        ),
                      )
                    else
                      ...activeReminders.take(2).map((reminder) {
                        final timeString = DateFormat('hh:mm a').format(reminder.reminderTime.toLocal());
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: GlassCard(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.orange.shade50,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(Icons.alarm_on_outlined, color: Colors.orange.shade600),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        reminder.title,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                          color: AppTheme.darkBlue,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Scheduled: $timeString',
                                        style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right, color: Colors.black26),
                              ],
                            ),
                          ),
                        );
                      }),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem({
    required String value,
    required String label,
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
  }) {
    return Expanded(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconBgColor,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.darkBlue,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickAction({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            width: 70,
            height: 70,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: color.withValues(alpha: 0.15), width: 1.5),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
      ],
    );
  }
}
