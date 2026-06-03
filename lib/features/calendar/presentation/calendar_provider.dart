import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/network/api_client.dart';

class CalendarEvent {
  final String id;
  final String userId;
  final String title;
  final String? description;
  final DateTime startTime;
  final DateTime endTime;
  final String eventType;
  final String source;
  final DateTime createdAt;

  CalendarEvent({
    required this.id,
    required this.userId,
    required this.title,
    this.description,
    required this.startTime,
    required this.endTime,
    required this.eventType,
    required this.source,
    required this.createdAt,
  });

  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    return CalendarEvent(
      id: json['id'],
      userId: json['userId'],
      title: json['title'],
      description: json['description'],
      startTime: DateTime.parse(json['startTime']),
      endTime: DateTime.parse(json['endTime']),
      eventType: json['eventType'] ?? 'GENERAL',
      source: json['source'] ?? 'APP',
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

class CalendarEventsNotifier extends StateNotifier<AsyncValue<List<CalendarEvent>>> {
  final Ref _ref;
  RealtimeChannel? _channel;

  CalendarEventsNotifier(this._ref) : super(const AsyncValue.loading()) {
    fetchCalendarEvents();
    _subscribeRealtime();
  }

  Future<void> fetchCalendarEvents() async {
    try {
      final response = await _ref.read(apiClientProvider).get('/calendar');
      final data = response.data['data'] as List;
      final events = data.map((json) => CalendarEvent.fromJson(json)).toList();
      state = AsyncValue.data(events);
    } catch (e, stackTrace) {
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> createCalendarEvent({
    required String title,
    String? description,
    required DateTime startTime,
    required DateTime endTime,
    required String eventType,
  }) async {
    await _ref.read(apiClientProvider).post(
      '/calendar',
      data: {
        'title': title,
        'description': description,
        'startTime': startTime.toIso8601String(),
        'endTime': endTime.toIso8601String(),
        'eventType': eventType,
      },
    );
    await fetchCalendarEvents();
  }

  Future<void> updateCalendarEvent(String id, Map<String, dynamic> data) async {
    await _ref.read(apiClientProvider).patch(
      '/calendar',
      data: {
        'id': id,
        ...data,
      },
    );
    await fetchCalendarEvents();
  }

  Future<void> deleteCalendarEvent(String id) async {
    await _ref.read(apiClientProvider).delete('/calendar?id=$id');
    await fetchCalendarEvents();
  }

  void _subscribeRealtime() {
    _channel = Supabase.instance.client
        .channel('public:calendar_events')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'calendar_events',
          callback: (payload) {
            fetchCalendarEvents();
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

final calendarEventsProvider = StateNotifierProvider<CalendarEventsNotifier, AsyncValue<List<CalendarEvent>>>((ref) {
  return CalendarEventsNotifier(ref);
});
