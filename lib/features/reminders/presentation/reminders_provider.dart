import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/local_notification_service.dart';
import '../../auth/presentation/auth_notifier.dart';

class Reminder {
  final String id;
  final String userId;
  final String title;
  final String? description;
  final DateTime reminderTime;
  final String repeatType;
  final String status;
  final DateTime createdAt;

  Reminder({
    required this.id,
    required this.userId,
    required this.title,
    this.description,
    required this.reminderTime,
    required this.repeatType,
    required this.status,
    required this.createdAt,
  });

  factory Reminder.fromJson(Map<String, dynamic> json) {
    return Reminder(
      id: json['id'],
      userId: json['userId'],
      title: json['title'],
      description: json['description'],
      reminderTime: DateTime.parse(json['reminderTime']),
      repeatType: json['repeatType'] ?? 'NONE',
      status: json['status'] ?? 'PENDING',
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

class RemindersNotifier extends StateNotifier<AsyncValue<List<Reminder>>> {
  final Ref _ref;
  RealtimeChannel? _channel;

  RemindersNotifier(this._ref) : super(const AsyncValue.loading()) {
    fetchReminders();
    _subscribeRealtime();
  }

  Future<void> fetchReminders() async {
    try {
      final response = await _ref.read(apiClientProvider).get('/reminders');
      final data = response.data['data'] as List;
      final reminders = data.map((json) => Reminder.fromJson(json)).toList();
      state = AsyncValue.data(reminders);
      
      // Reschedule all local alarms for active reminders
      await LocalNotificationService.cancelAll();
      for (final r in reminders) {
        if (r.status == 'PENDING' && r.reminderTime.isAfter(DateTime.now())) {
          await LocalNotificationService.scheduleNotification(
            id: _uuidToInt(r.id),
            title: r.title,
            body: r.description ?? 'Academic Reminder Alert',
            scheduledDate: r.reminderTime,
          );
        }
      }
    } catch (e, stackTrace) {
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> createReminder({
    required String title,
    String? description,
    required DateTime reminderTime,
    required String repeatType,
    bool addToGoogleCalendar = false,
  }) async {
    final response = await _ref.read(apiClientProvider).post(
      '/reminders',
      data: {
        'title': title,
        'description': description,
        'reminderTime': reminderTime.toIso8601String(),
        'repeatType': repeatType,
        'addToGoogleCalendar': addToGoogleCalendar,
      },
    );
    final newReminder = Reminder.fromJson(response.data['data']);
    
    // Immediately schedule local alarm
    if (newReminder.reminderTime.isAfter(DateTime.now())) {
      await LocalNotificationService.scheduleNotification(
        id: _uuidToInt(newReminder.id),
        title: newReminder.title,
        body: newReminder.description ?? 'Academic Reminder Alert',
        scheduledDate: newReminder.reminderTime,
      );
    }

    await fetchReminders();
  }

  Future<void> updateReminderStatus(String id, String status) async {
    await _ref.read(apiClientProvider).patch(
      '/reminders',
      data: {
        'id': id,
        'status': status,
      },
    );
    
    if (status != 'PENDING') {
      await LocalNotificationService.cancelNotification(_uuidToInt(id));
    }
    
    await fetchReminders();
  }

  Future<void> deleteReminder(String id) async {
    await _ref.read(apiClientProvider).delete('/reminders?id=$id');
    await LocalNotificationService.cancelNotification(_uuidToInt(id));
    await fetchReminders();
  }

  int _uuidToInt(String uuid) {
    return uuid.hashCode & 0x7FFFFFFF;
  }

  void _subscribeRealtime() {
    final user = _ref.read(authNotifierProvider).user;
    if (user == null) return;

    _channel = Supabase.instance.client
        .channel('public:reminders')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'reminders',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: user.id,
          ),
          callback: (payload) {
            fetchReminders();
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

final remindersProvider = StateNotifierProvider<RemindersNotifier, AsyncValue<List<Reminder>>>((ref) {
  ref.watch(authNotifierProvider);
  return RemindersNotifier(ref);
});
