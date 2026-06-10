import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import 'package:haptic_feedback/haptic_feedback.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_card.dart';
import '../../deadlines/presentation/deadlines_provider.dart';
import '../../reminders/presentation/reminders_provider.dart';
import '../../profile/presentation/google_sync_provider.dart';
import 'calendar_provider.dart';

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();
  String _selectedCategory = 'ALL'; // 'ALL', 'DEADLINES', 'EVENTS', 'REMINDERS'

  @override
  void initState() {
    super.initState();
    // Normalize selected day to remove time components
    _selectedDay = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
  }

  // Helper: check if two DateTimes fall on the same calendar day
  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  @override
  Widget build(BuildContext context) {
    final deadlinesState = ref.watch(deadlinesProvider);
    final remindersState = ref.watch(remindersProvider);
    final calendarState = ref.watch(calendarEventsProvider);

    // Combine loaded items into single lists
    final List<Deadline> allDeadlines = deadlinesState.maybeWhen(
      data: (list) => list,
      orElse: () => [],
    );
    final List<Reminder> allReminders = remindersState.maybeWhen(
      data: (list) => list,
      orElse: () => [],
    );
    final List<CalendarEvent> allCalendarEvents = calendarState.maybeWhen(
      data: (list) => list,
      orElse: () => [],
    );

    // Filter list items based on selected category & day
    final dayDeadlines = (_selectedCategory == 'ALL' || _selectedCategory == 'DEADLINES')
        ? allDeadlines.where((d) => _isSameDay(d.dueDate, _selectedDay)).toList()
        : <Deadline>[];
        
    final dayReminders = (_selectedCategory == 'ALL' || _selectedCategory == 'REMINDERS')
        ? allReminders.where((r) => _isSameDay(r.reminderTime, _selectedDay)).toList()
        : <Reminder>[];
        
    final dayEvents = (_selectedCategory == 'ALL' || _selectedCategory == 'EVENTS')
        ? allCalendarEvents.where((e) => _isSameDay(e.startTime, _selectedDay)).toList()
        : <CalendarEvent>[];

    final hasAnySchedule = dayDeadlines.isNotEmpty || dayReminders.isNotEmpty || dayEvents.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Academic Schedule',
          style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.darkBlue),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.primary),
            onPressed: () async {
              final scaffoldMessenger = ScaffoldMessenger.of(context);
              scaffoldMessenger.showSnackBar(
                const SnackBar(
                  content: Row(
                    children: [
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      ),
                      SizedBox(width: 16),
                      Text('Syncing with Google Calendar...'),
                    ],
                  ),
                  duration: Duration(days: 1),
                ),
              );

              final success = await ref.read(googleSyncProvider.notifier).triggerSync();
              
              scaffoldMessenger.hideCurrentSnackBar();
              
              if (success) {
                await Future.wait<void>([
                  ref.read(calendarEventsProvider.notifier).fetchCalendarEvents(),
                  ref.read(deadlinesProvider.notifier).fetchDeadlines(),
                  ref.read(remindersProvider.notifier).fetchReminders(),
                ]);
                
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Sync completed successfully!'),
                    backgroundColor: Colors.green,
                  ),
                );
              } else {
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Failed to sync. Please check your connection.'),
                    backgroundColor: AppTheme.error,
                  ),
                );
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.tune, color: AppTheme.primary),
            onPressed: () {},
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: Column(
        children: [
          // TableCalendar Widget Card with Custom Header Controls
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: GlassCard(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
              child: Column(
                children: [
                  // Custom Calendar Header Controls
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: Icon(Icons.chevron_left, color: Colors.grey.shade600),
                        onPressed: () {
                          setState(() {
                            // Page backward by 1 month
                            _focusedDay = DateTime(_focusedDay.year, _focusedDay.month - 1);
                          });
                        },
                      ),
                      Row(
                        children: [
                          Text(
                            DateFormat('MMMM yyyy').format(_focusedDay),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.darkBlue,
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Dropdown selector for calendar format
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<CalendarFormat>(
                                value: _calendarFormat,
                                icon: const Icon(Icons.keyboard_arrow_down, size: 16, color: AppTheme.primary),
                                style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 12),
                                dropdownColor: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(() {
                                      _calendarFormat = val;
                                    });
                                  }
                                },
                                items: const [
                                  DropdownMenuItem(
                                    value: CalendarFormat.month,
                                    child: Text('Month'),
                                  ),
                                  DropdownMenuItem(
                                    value: CalendarFormat.twoWeeks,
                                    child: Text('2 weeks'),
                                  ),
                                  DropdownMenuItem(
                                    value: CalendarFormat.week,
                                    child: Text('Week'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: Icon(Icons.chevron_right, color: Colors.grey.shade600),
                        onPressed: () {
                          setState(() {
                            // Page forward by 1 month
                            _focusedDay = DateTime(_focusedDay.year, _focusedDay.month + 1);
                          });
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  
                  // TableCalendar Grid
                  TableCalendar(
                    firstDay: DateTime.now().subtract(const Duration(days: 365)),
                    lastDay: DateTime.now().add(const Duration(days: 365)),
                    focusedDay: _focusedDay,
                    calendarFormat: _calendarFormat,
                    headerVisible: false, // Hide default TableCalendar header
                    selectedDayPredicate: (day) {
                      return _isSameDay(_selectedDay, day);
                    },
                    onDaySelected: (selectedDay, focusedDay) {
                      setState(() {
                        _selectedDay = DateTime(selectedDay.year, selectedDay.month, selectedDay.day);
                        _focusedDay = focusedDay;
                      });
                    },
                    onFormatChanged: (format) {
                      if (_calendarFormat != format) {
                        setState(() {
                          _calendarFormat = format;
                        });
                      }
                    },
                    onPageChanged: (focusedDay) {
                      setState(() {
                        _focusedDay = focusedDay;
                      });
                    },
                    eventLoader: (day) {
                      // Return items markers for dot builder
                      final dMatch = allDeadlines.any((d) => _isSameDay(d.dueDate, day));
                      final rMatch = allReminders.any((r) => _isSameDay(r.reminderTime, day));
                      final eMatch = allCalendarEvents.any((e) => _isSameDay(e.startTime, day));
                      
                      List<String> markers = [];
                      if (dMatch) markers.add('deadline');
                      if (rMatch) markers.add('reminder');
                      if (eMatch) markers.add('event');
                      return markers;
                    },
                    calendarStyle: CalendarStyle(
                      selectedDecoration: const BoxDecoration(
                        color: AppTheme.primary,
                        shape: BoxShape.circle,
                      ),
                      todayDecoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.3),
                        shape: BoxShape.circle,
                      ),
                      markerDecoration: const BoxDecoration(
                        color: Colors.redAccent,
                        shape: BoxShape.circle,
                      ),
                      markersMaxCount: 3,
                      outsideTextStyle: TextStyle(color: Colors.grey.shade300),
                      outsideDaysVisible: true,
                    ),
                    calendarBuilders: CalendarBuilders(
                      markerBuilder: (context, date, events) {
                        if (events.isEmpty) return const SizedBox.shrink();
                        return Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: events.map((event) {
                            Color markerColor = Colors.grey;
                            if (event == 'deadline') markerColor = Colors.red;
                            if (event == 'reminder') markerColor = AppTheme.primary;
                            if (event == 'event') markerColor = Colors.green;
                            return Container(
                              margin: const EdgeInsets.symmetric(horizontal: 1.5),
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: markerColor,
                              ),
                            );
                          }).toList(),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 8),
          
          // Selected Day Banner with "Today" Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.calendar_month, color: AppTheme.primary, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    DateFormat('EEEE, MMMM dd').format(_selectedDay),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.darkBlue,
                    ),
                  ),
                ),
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      final now = DateTime.now();
                      _selectedDay = DateTime(now.year, now.month, now.day);
                      _focusedDay = now;
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade50,
                    foregroundColor: AppTheme.primary,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  ),
                  child: const Text('Today', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 4),

          // Capsule Category Toggles
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildCategoryCapsule('ALL', 'All', null, Colors.transparent),
                  _buildCategoryCapsule('DEADLINES', 'Deadlines', Icons.flag, Colors.red),
                  _buildCategoryCapsule('EVENTS', 'Events', Icons.school, Colors.green),
                  _buildCategoryCapsule('REMINDERS', 'Reminders', Icons.alarm, AppTheme.primary),
                ],
              ),
            ),
          ),

          const SizedBox(height: 8),

          // Selected day items list
          Expanded(
            child: !hasAnySchedule
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.calendar_today_outlined, size: 48, color: Colors.grey.shade300),
                        const SizedBox(height: 12),
                        Text(
                          'No schedule or deadlines for this day',
                          style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                        ),
                      ],
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.only(left: 24, right: 24, top: 8, bottom: 88),
                    children: [
                      // Render Deadlines
                      if (dayDeadlines.isNotEmpty) ...[
                        const Text('DEADLINES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.red, letterSpacing: 1.2)),
                        const SizedBox(height: 8),
                        ...dayDeadlines.map((d) {
                          Color priorityBadgeColor;
                          Color priorityBadgeBg;
                          switch (d.priority) {
                            case 'HIGH':
                              priorityBadgeColor = Colors.red.shade700;
                              priorityBadgeBg = Colors.red.shade50;
                              break;
                            case 'MEDIUM':
                              priorityBadgeColor = Colors.amber.shade800;
                              priorityBadgeBg = Colors.amber.shade50;
                              break;
                            default:
                              priorityBadgeColor = Colors.green.shade700;
                              priorityBadgeBg = Colors.green.shade50;
                          }
                          return _buildCustomScheduleCard(
                            context: context,
                            title: d.title,
                            subtitle: d.description,
                            time: DateFormat('hh:mm a').format(d.dueDate.toLocal()),
                            icon: Icons.flag,
                            iconColor: Colors.red,
                            iconBgColor: Colors.red.shade50,
                            priorityBadgeText: d.priority,
                            priorityBadgeColor: priorityBadgeColor,
                            priorityBadgeBg: priorityBadgeBg,
                            trailing: Checkbox(
                              value: d.isCompleted,
                              activeColor: Colors.green,
                              onChanged: (val) {
                                if (val != null) {
                                  ref.read(deadlinesProvider.notifier).updateDeadline(d.id, {'isCompleted': val});
                                }
                              },
                            ),
                          );
                        }),
                      ],
                      
                      // Render Calendar Events
                      if (dayEvents.isNotEmpty) ...[
                        if (dayDeadlines.isNotEmpty) const SizedBox(height: 16),
                        const Text('CALENDAR EVENTS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green, letterSpacing: 1.2)),
                        const SizedBox(height: 8),
                        ...dayEvents.map((e) => _buildCustomScheduleCard(
                          context: context,
                          title: e.title,
                          subtitle: e.description ?? 'Academic Event',
                          time: '${DateFormat('hh:mm a').format(e.startTime.toLocal())} - ${DateFormat('hh:mm a').format(e.endTime.toLocal())}',
                          icon: Icons.school,
                          iconColor: Colors.green,
                          iconBgColor: Colors.green.shade50,
                          trailing: IconButton(
                            icon: const Icon(Icons.delete_outline, color: AppTheme.error, size: 20),
                            onPressed: () => _showDeleteEventConfirm(context, e.id),
                          ),
                        )),
                      ],

                      // Render Reminders
                      if (dayReminders.isNotEmpty) ...[
                        if (dayDeadlines.isNotEmpty || dayEvents.isNotEmpty) const SizedBox(height: 16),
                        const Text('PERSONAL REMINDERS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary, letterSpacing: 1.2)),
                        const SizedBox(height: 8),
                        ...dayReminders.map((r) => _buildCustomScheduleCard(
                          context: context,
                          title: r.title,
                          subtitle: '${r.description ?? "Reminder alert"} (${r.repeatType})',
                          time: DateFormat('hh:mm a').format(r.reminderTime.toLocal()),
                          icon: Icons.alarm,
                          iconColor: AppTheme.primary,
                          iconBgColor: AppTheme.primary.withValues(alpha: 0.1),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Checkbox(
                                value: r.status == 'COMPLETED',
                                activeColor: Colors.green,
                                onChanged: (val) {
                                  if (val != null) {
                                    ref.read(remindersProvider.notifier).updateReminderStatus(
                                      r.id,
                                      val ? 'COMPLETED' : 'PENDING',
                                    );
                                  }
                                },
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, color: AppTheme.error, size: 20),
                                onPressed: () => _showDeleteReminderConfirm(context, r.id),
                              ),
                            ],
                          ),
                        )),
                      ],
                    ],
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddEventOrReminderModal(context),
        backgroundColor: AppTheme.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildCategoryCapsule(String category, String label, IconData? icon, Color iconColor) {
    final isSelected = _selectedCategory == category;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        showCheckmark: false,
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, color: isSelected ? Colors.white : iconColor, size: 16),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : AppTheme.darkBlue,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ],
        ),
        selected: isSelected,
        selectedColor: AppTheme.primary,
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: isSelected ? Colors.transparent : Colors.grey.shade200,
          ),
        ),
        onSelected: (val) {
          setState(() {
            _selectedCategory = category;
          });
        },
      ),
    );
  }

  Widget _buildCustomScheduleCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required String time,
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    Widget? trailing,
    String? priorityBadgeText,
    Color? priorityBadgeColor,
    Color? priorityBadgeBg,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        backgroundColor: Colors.white,
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconBgColor,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: AppTheme.darkBlue,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.access_time_filled, size: 14, color: Colors.black38),
                          const SizedBox(width: 4),
                          Text(
                            time,
                            style: const TextStyle(color: Colors.black45, fontSize: 12, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                      if (priorityBadgeText != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: priorityBadgeBg ?? Colors.red.shade50,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            priorityBadgeText,
                            style: TextStyle(
                              color: priorityBadgeColor ?? Colors.red.shade700,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            if (trailing != null) ...[
              const SizedBox(width: 8),
              trailing,
            ],
          ],
        ),
      ),
    );
  }

  void _showDeleteEventConfirm(BuildContext context, String eventId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Calendar Event'),
        content: const Text('Are you sure you want to permanently delete this calendar event? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppTheme.error),
            onPressed: () async {
              final scaffoldMessenger = ScaffoldMessenger.of(context);
              Navigator.pop(ctx);
              try {
                await ref.read(calendarEventsProvider.notifier).deleteCalendarEvent(eventId);
                try {
                  if (await Haptics.canVibrate()) {
                    await Haptics.vibrate(HapticsType.warning);
                  }
                } catch (_) {}
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Calendar event deleted successfully!'),
                    backgroundColor: Colors.green,
                  ),
                );
              } catch (err) {
                scaffoldMessenger.showSnackBar(
                  SnackBar(
                    content: Text('Failed to delete event: $err'),
                    backgroundColor: AppTheme.error,
                  ),
                );
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showDeleteReminderConfirm(BuildContext context, String reminderId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Reminder'),
        content: const Text('Are you sure you want to permanently delete this reminder? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppTheme.error),
            onPressed: () async {
              final scaffoldMessenger = ScaffoldMessenger.of(context);
              Navigator.pop(ctx);
              try {
                await ref.read(remindersProvider.notifier).deleteReminder(reminderId);
                try {
                  if (await Haptics.canVibrate()) {
                    await Haptics.vibrate(HapticsType.warning);
                  }
                } catch (_) {}
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Reminder deleted successfully!'),
                    backgroundColor: Colors.green,
                  ),
                );
              } catch (err) {
                scaffoldMessenger.showSnackBar(
                  SnackBar(
                    content: Text('Failed to delete reminder: $err'),
                    backgroundColor: AppTheme.error,
                  ),
                );
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showAddEventOrReminderModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return const AddEventOrReminderSheet();
      },
    );
  }
}

class AddEventOrReminderSheet extends ConsumerStatefulWidget {
  const AddEventOrReminderSheet({super.key});

  @override
  ConsumerState<AddEventOrReminderSheet> createState() => _AddEventOrReminderSheetState();
}

class _AddEventOrReminderSheetState extends ConsumerState<AddEventOrReminderSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  
  // Tab index: 0 = Calendar Event, 1 = Personal Reminder
  int _selectedTab = 0;
  
  DateTime _startTime = DateTime.now().add(const Duration(hours: 1));
  DateTime _endTime = DateTime.now().add(const Duration(hours: 2));
  String _eventType = 'GENERAL'; // 'GENERAL', 'CLASS', 'MEETING', 'EXAM'
  String _repeatType = 'NONE'; // 'NONE', 'DAILY', 'WEEKLY', 'MONTHLY'
  bool _addToGoogleCalendar = false;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Schedule New Item',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.darkBlue,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              
              // Selector Chip Row
              Row(
                children: [
                  ChoiceChip(
                    label: const Text('Calendar Event'),
                    selected: _selectedTab == 0,
                    onSelected: (val) {
                      if (val) setState(() => _selectedTab = 0);
                    },
                  ),
                  const SizedBox(width: 12),
                  ChoiceChip(
                    label: const Text('Personal Reminder'),
                    selected: _selectedTab == 1,
                    onSelected: (val) {
                      if (val) setState(() => _selectedTab = 1);
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              // Common: Title
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(labelText: 'Title'),
                validator: (val) => val == null || val.trim().isEmpty ? 'Please enter a title' : null,
              ),
              const SizedBox(height: 12),

              // Common: Description
              TextFormField(
                controller: _descController,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Description / Notes'),
              ),
              const SizedBox(height: 16),

              if (_selectedTab == 0) ...[
                // Event Type Dropdown
                DropdownButtonFormField<String>(
                  initialValue: _eventType,
                  decoration: const InputDecoration(labelText: 'Event Type'),
                  items: const [
                    DropdownMenuItem(value: 'GENERAL', child: Text('General')),
                    DropdownMenuItem(value: 'CLASS', child: Text('Lecture Class')),
                    DropdownMenuItem(value: 'MEETING', child: Text('Faculty Meeting')),
                    DropdownMenuItem(value: 'EXAM', child: Text('Exam Invigilation')),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _eventType = val);
                  },
                ),
                const SizedBox(height: 16),
                
                // Start Time
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Start Time', style: TextStyle(color: Colors.black54, fontSize: 12)),
                        const SizedBox(height: 4),
                        Text(
                          DateFormat('EEE, MMM dd, hh:mm a').format(_startTime.toLocal()),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.darkBlue),
                        ),
                      ],
                    ),
                    OutlinedButton(
                      onPressed: () => _pickDateTime(true),
                      child: const Text('Change'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // End Time
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('End Time', style: TextStyle(color: Colors.black54, fontSize: 12)),
                        const SizedBox(height: 4),
                        Text(
                          DateFormat('EEE, MMM dd, hh:mm a').format(_endTime.toLocal()),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.darkBlue),
                        ),
                      ],
                    ),
                    OutlinedButton(
                      onPressed: () => _pickDateTime(false),
                      child: const Text('Change'),
                    ),
                  ],
                ),
              ] else ...[
                // Reminder Time
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Reminder Time', style: TextStyle(color: Colors.black54, fontSize: 12)),
                        const SizedBox(height: 4),
                        Text(
                          DateFormat('EEE, MMM dd, hh:mm a').format(_startTime.toLocal()),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.darkBlue),
                        ),
                      ],
                    ),
                    OutlinedButton(
                      onPressed: () => _pickDateTime(true),
                      child: const Text('Change'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Repeat Dropdown
                DropdownButtonFormField<String>(
                  initialValue: _repeatType,
                  decoration: const InputDecoration(labelText: 'Repeat Interval'),
                  items: const [
                    DropdownMenuItem(value: 'NONE', child: Text('No Repeat')),
                    DropdownMenuItem(value: 'DAILY', child: Text('Every Day')),
                    DropdownMenuItem(value: 'WEEKLY', child: Text('Every Week')),
                    DropdownMenuItem(value: 'MONTHLY', child: Text('Every Month')),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _repeatType = val);
                  },
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  title: const Text('Add to Google Calendar', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                  subtitle: const Text('Sync this reminder to your Google Calendar', style: TextStyle(fontSize: 12)),
                  contentPadding: EdgeInsets.zero,
                  value: _addToGoogleCalendar,
                  activeThumbColor: AppTheme.primary,
                  onChanged: (val) {
                    setState(() {
                      _addToGoogleCalendar = val;
                    });
                  },
                ),
              ],

              const SizedBox(height: 28),

              // Save Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _submitForm,
                  child: const Text(
                    'Add Schedule Item',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickDateTime(bool isStart) async {
    final initialDate = isStart ? _startTime : _endTime;
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (pickedDate != null) {
      if (!mounted) return;
      final pickedTime = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(initialDate),
      );
      if (pickedTime != null) {
        setState(() {
          final newDt = DateTime(
            pickedDate.year,
            pickedDate.month,
            pickedDate.day,
            pickedTime.hour,
            pickedTime.minute,
          );
          if (isStart) {
            _startTime = newDt;
            // Shift end time if it is now before start time
            if (_endTime.isBefore(_startTime)) {
              _endTime = _startTime.add(const Duration(hours: 1));
            }
          } else {
            _endTime = newDt;
          }
        });
      }
    }
  }

  Future<void> _submitForm() async {
    if (_formKey.currentState?.validate() ?? false) {
      try {
        if (_selectedTab == 0) {
          // Calendar Event
          await ref.read(calendarEventsProvider.notifier).createCalendarEvent(
            title: _titleController.text.trim(),
            description: _descController.text.trim(),
            startTime: _startTime,
            endTime: _endTime,
            eventType: _eventType,
          );
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Calendar event created successfully!'),
                backgroundColor: Colors.green,
              ),
            );
          }
        } else {
          // Reminder
          await ref.read(remindersProvider.notifier).createReminder(
            title: _titleController.text.trim(),
            description: _descController.text.trim(),
            reminderTime: _startTime,
            repeatType: _repeatType,
            addToGoogleCalendar: _addToGoogleCalendar,
          );
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Reminder created successfully!'),
                backgroundColor: Colors.green,
              ),
            );
          }
        }
        if (mounted) {
          Navigator.pop(context);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to save item: $e')),
          );
        }
      }
    }
  }
}
