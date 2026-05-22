import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_card.dart';

class DeadlinesScreen extends StatelessWidget {
  const DeadlinesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Academic Deadlines',
          style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.darkBlue),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
        children: [
          _buildDeadlineItem(
            'CIA-II Answer Script Submission',
            'All faculty must submit evaluated scripts to the exam cell.',
            'Tomorrow, 4:00 PM',
            'HIGH',
          ),
          _buildDeadlineItem(
            'Submit Lesson Plan (CS 4th Sem)',
            'Prepare and upload semester plans for review by the HOD.',
            'May 25, 2026',
            'MEDIUM',
          ),
          _buildDeadlineItem(
            'QIP Registration Deadline',
            'Register for the upcoming Faculty Development Quality Improvement Program.',
            'June 01, 2026',
            'LOW',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        backgroundColor: AppTheme.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildDeadlineItem(String title, String desc, String date, String priority) {
    Color priorityColor;
    Color priorityBg;
    
    switch (priority) {
      case 'HIGH':
        priorityColor = Colors.red.shade700;
        priorityBg = Colors.red.shade50;
        break;
      case 'MEDIUM':
        priorityColor = Colors.amber.shade800;
        priorityBg = Colors.amber.shade50;
        break;
      default:
        priorityColor = Colors.green.shade700;
        priorityBg = Colors.green.shade50;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GlassCard(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: priorityBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    priority,
                    style: TextStyle(
                      color: priorityColor,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Text(
                  date,
                  style: const TextStyle(
                    color: Colors.black45,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: AppTheme.darkBlue,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              desc,
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 14,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
