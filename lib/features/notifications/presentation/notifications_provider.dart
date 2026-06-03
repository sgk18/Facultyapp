import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/network/api_client.dart';

class AppNotification {
  final String id;
  final String userId;
  final String title;
  final String body;
  final String type;
  final bool isRead;
  final DateTime createdAt;
  final String? relatedDeadlineId;

  AppNotification({
    required this.id,
    required this.userId,
    required this.title,
    required this.body,
    required this.type,
    required this.isRead,
    required this.createdAt,
    this.relatedDeadlineId,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'],
      userId: json['userId'],
      title: json['title'],
      body: json['body'],
      type: json['type'] ?? 'DEADLINE',
      isRead: json['isRead'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
      relatedDeadlineId: json['relatedDeadlineId'],
    );
  }
}

class NotificationsNotifier extends StateNotifier<AsyncValue<List<AppNotification>>> {
  final Ref _ref;
  RealtimeChannel? _channel;

  NotificationsNotifier(this._ref) : super(const AsyncValue.loading()) {
    fetchNotifications();
    _subscribeRealtime();
  }

  Future<void> fetchNotifications() async {
    try {
      final response = await _ref.read(apiClientProvider).get('/notifications');
      final data = response.data['data'] as List;
      final notifications = data.map((json) => AppNotification.fromJson(json)).toList();
      state = AsyncValue.data(notifications);
    } catch (e, stackTrace) {
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await _ref.read(apiClientProvider).patch('/notifications', data: {'all': true});
      await fetchNotifications();
    } catch (_) {}
  }

  Future<void> markSingleAsRead(String id) async {
    try {
      await _ref.read(apiClientProvider).patch('/notifications', data: {'id': id});
      await fetchNotifications();
    } catch (_) {}
  }

  Future<void> deleteNotification(String id) async {
    try {
      await _ref.read(apiClientProvider).delete('/notifications?id=$id');
      await fetchNotifications();
    } catch (_) {}
  }

  void _subscribeRealtime() {
    _channel = Supabase.instance.client
        .channel('public:notifications')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'notifications',
          callback: (payload) {
            fetchNotifications();
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

final notificationsProvider = StateNotifierProvider<NotificationsNotifier, AsyncValue<List<AppNotification>>>((ref) {
  return NotificationsNotifier(ref);
});
