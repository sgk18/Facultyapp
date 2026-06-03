import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/network/api_client.dart';
import '../../auth/presentation/auth_notifier.dart';
import '../../notifications/presentation/notifications_provider.dart';
import '../../reminders/presentation/reminders_provider.dart';
import '../../calendar/presentation/calendar_provider.dart';

class Deadline {
  final String id;
  final String title;
  final String description;
  final DateTime dueDate;
  final String priority;
  final String departmentId;
  final String createdById;
  final bool isCompleted;
  final String status;
  final String? createdByFullName;
  final String? departmentName;

  Deadline({
    required this.id,
    required this.title,
    required this.description,
    required this.dueDate,
    required this.priority,
    required this.departmentId,
    required this.createdById,
    required this.isCompleted,
    required this.status,
    this.createdByFullName,
    this.departmentName,
  });

  factory Deadline.fromJson(Map<String, dynamic> json) {
    return Deadline(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      dueDate: DateTime.parse(json['dueDate']),
      priority: json['priority'],
      departmentId: json['departmentId'],
      createdById: json['ownerId'] ?? '',
      isCompleted: json['isCompleted'] ?? false,
      status: json['status'] ?? 'ACTIVE',
      createdByFullName: json['owner']?['fullName'],
      departmentName: json['department']?['name'],
    );
  }
}

class DeadlinesNotifier extends StateNotifier<AsyncValue<List<Deadline>>> {
  final Ref _ref;
  RealtimeChannel? _channel;

  DeadlinesNotifier(this._ref) : super(const AsyncValue.loading()) {
    fetchDeadlines();
    _subscribeRealtime();
  }

  Future<void> fetchDeadlines() async {
    try {
      final response = await _ref.read(apiClientProvider).get('/deadlines');
      final data = response.data['data'] as List;
      final deadlines = data.map((json) => Deadline.fromJson(json)).toList();
      state = AsyncValue.data(deadlines);
    } catch (e, stackTrace) {
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> createDeadline({
    required String title,
    required String description,
    required DateTime dueDate,
    required String priority,
    required String departmentId,
    bool addToGoogleCalendar = false,
    List<String>? reminderSettings,
  }) async {
    await _ref.read(apiClientProvider).post(
      '/deadlines',
      data: {
        'title': title,
        'description': description,
        'dueDate': dueDate.toIso8601String(),
        'priority': priority,
        'departmentId': departmentId,
        'addToGoogleCalendar': addToGoogleCalendar,
        if (reminderSettings != null) 'reminderSettings': reminderSettings,
      },
    );
    await Future.wait([
      fetchDeadlines(),
      _ref.read(notificationsProvider.notifier).fetchNotifications(),
      _ref.read(remindersProvider.notifier).fetchReminders(),
      _ref.read(calendarEventsProvider.notifier).fetchCalendarEvents(),
    ]);
  }

  Future<void> updateDeadline(String id, Map<String, dynamic> data) async {
    await _ref.read(apiClientProvider).patch(
      '/deadlines/$id',
      data: data,
    );
    await Future.wait([
      fetchDeadlines(),
      _ref.read(notificationsProvider.notifier).fetchNotifications(),
      _ref.read(remindersProvider.notifier).fetchReminders(),
      _ref.read(calendarEventsProvider.notifier).fetchCalendarEvents(),
    ]);
  }

  Future<void> deleteDeadline(String id) async {
    await _ref.read(apiClientProvider).delete('/deadlines/$id');
    await Future.wait([
      fetchDeadlines(),
      _ref.read(notificationsProvider.notifier).fetchNotifications(),
      _ref.read(remindersProvider.notifier).fetchReminders(),
      _ref.read(calendarEventsProvider.notifier).fetchCalendarEvents(),
    ]);
  }

  void _subscribeRealtime() {
    final user = _ref.read(authNotifierProvider).user;
    if (user == null) return;

    _channel = Supabase.instance.client
        .channel('public:deadlines')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'deadlines',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'owner_id',
            value: user.id,
          ),
          callback: (payload) {
            fetchDeadlines();
          },
        );
    _channel?.subscribe();
  }

  @override
  void dispose() {
    if (_channel != null) {
      Supabase.instance.client.removeChannel(_channel!);
    }
    super.dispose();
  }
}

final deadlinesProvider = StateNotifierProvider<DeadlinesNotifier, AsyncValue<List<Deadline>>>((ref) {
  ref.watch(authNotifierProvider);
  return DeadlinesNotifier(ref);
});

class Department {
  final String id;
  final String name;
  final String code;

  Department({required this.id, required this.name, required this.code});

  factory Department.fromJson(Map<String, dynamic> json) {
    return Department(
      id: json['id'] as String,
      name: json['name'] as String,
      code: json['code'] as String,
    );
  }
}

class DepartmentsNotifier extends StateNotifier<AsyncValue<List<Department>>> {
  final Ref _ref;

  DepartmentsNotifier(this._ref) : super(const AsyncValue.loading()) {
    fetchDepartments();
  }

  Future<void> fetchDepartments() async {
    try {
      final response = await _ref.read(apiClientProvider).get('/departments');
      final data = response.data['data'] as List;
      final departments = data.map((json) => Department.fromJson(json)).toList();
      state = AsyncValue.data(departments);
    } catch (e, stackTrace) {
      state = AsyncValue.error(e, stackTrace);
    }
  }
}

final departmentsProvider = StateNotifierProvider<DepartmentsNotifier, AsyncValue<List<Department>>>((ref) {
  return DepartmentsNotifier(ref);
});
