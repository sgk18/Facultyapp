import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_card.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Notifications',
          style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.darkBlue),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.mark_email_read_outlined, color: AppTheme.primary),
            onPressed: () {},
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
        children: [
          _buildNotificationCard(
            'New Exam Circular Published',
            'The CIA-III exam timetable has been uploaded. Please review your assigned invigilations.',
            '2 hours ago',
            true,
          ),
          _buildNotificationCard(
            'Lesson Plan Approved',
            'Your lesson plan for database management systems has been approved by the HOD.',
            'Yesterday',
            false,
          ),
          _buildNotificationCard(
            'IT Maintenance Notice',
            'The university LMS portal will be offline for maintenance on Sunday from 2 AM to 5 AM.',
            '3 days ago',
            false,
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationCard(String title, String body, String time, bool isUnread) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GlassCard(
        backgroundColor: isUnread ? AppTheme.primary.withValues(alpha: 0.04) : Colors.white,
        padding: const EdgeInsets.all(20),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isUnread ? AppTheme.primary.withValues(alpha: 0.1) : Colors.grey.shade100,
                shape: BoxShape.circle,
              ),
              child: Icon(
                isUnread ? Icons.mark_unread_chat_alt_outlined : Icons.chat_bubble_outline,
                color: isUnread ? AppTheme.primary : Colors.grey.shade600,
                size: 20,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: isUnread ? AppTheme.primary : AppTheme.darkBlue,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        time,
                        style: const TextStyle(
                          color: Colors.black45,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    body,
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 14,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
