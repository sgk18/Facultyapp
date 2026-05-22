import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_card.dart';

class CalendarScreen extends StatelessWidget {
  const CalendarScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Academic Schedule',
          style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.darkBlue),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _buildScheduleCard('09:00 AM - 10:00 AM', 'Database Management Systems', 'BTech CS - Sec A', 'Block II, Room 402'),
          _buildScheduleCard('11:15 AM - 12:15 PM', 'Object Oriented Programming', 'BTech CS - Sec B', 'Block II, Room 201'),
          _buildScheduleCard('02:00 PM - 03:00 PM', 'Faculty General Assembly', 'All Departments', 'Main Auditorium'),
        ],
      ),
    );
  }

  Widget _buildScheduleCard(String time, String title, String cls, String location) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GlassCard(
        padding: const EdgeInsets.all(20),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  time.split(' - ')[0],
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: AppTheme.primary,
                  ),
                ),
                Text(
                  time.split(' - ')[1],
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.black45,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 24),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: AppTheme.darkBlue,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.people_outline, size: 14, color: Colors.black45),
                      const SizedBox(width: 4),
                      Text(cls, style: const TextStyle(color: Colors.black54, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 14, color: Colors.black45),
                      const SizedBox(width: 4),
                      Text(location, style: const TextStyle(color: Colors.black54, fontSize: 13)),
                    ],
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
