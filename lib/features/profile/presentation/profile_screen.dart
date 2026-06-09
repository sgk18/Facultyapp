import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/gradient_container.dart';
import '../../../core/constants/app_constants.dart';
import '../../auth/presentation/auth_notifier.dart';
import 'google_sync_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final googleSyncState = ref.watch(googleSyncProvider);
    final user = authState.user;
    
    final facultyName = user?.fullName ?? 'Faculty Member';
    final facultyEmail = user?.email ?? 'faculty.member@christuniversity.in';
    final departmentName = user?.departmentName ?? 'Department of Computer Science';
    final roleName = user?.role ?? 'FACULTY';
    final employeeCode = user?.employeeCode ?? 'Not Assigned';

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFC),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Curved Blue Header & Floating Avatar Stack
            Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: [
                GradientContainer(
                  padding: const EdgeInsets.only(top: 64, left: 24, right: 24, bottom: 80),
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(32),
                    bottomRight: Radius.circular(32),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'My Profile',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.settings_outlined, color: Colors.white),
                        onPressed: () {},
                      ),
                    ],
                  ),
                ),
                Positioned(
                  bottom: -50,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          gradient: AppTheme.mainGradient,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 4),
                          boxShadow: AppTheme.premiumShadow,
                        ),
                        child: Center(
                          child: Text(
                            user?.initials ?? 'SM',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: AppTheme.primary,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                            ],
                          ),
                          child: const Icon(Icons.edit, color: Colors.white, size: 16),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 66), // Spacer for overlapping avatar
            
            // Name and Role Badge
            Center(
              child: Column(
                children: [
                  Text(
                    facultyName,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.darkBlue,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.shield_outlined, size: 14, color: Colors.blue.shade700),
                        const SizedBox(width: 4),
                        Text(
                          roleName,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  // Info card containing copyable details
                  GlassCard(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    child: Column(
                      children: [
                        _buildDetailField(context, icon: Icons.mail_outline, label: 'Email', value: facultyEmail),
                        const Divider(height: 1, indent: 64),
                        _buildDetailField(context, icon: Icons.business, label: 'Department', value: departmentName),
                        const Divider(height: 1, indent: 64),
                        _buildDetailField(context, icon: Icons.badge_outlined, label: 'Employee Code', value: employeeCode),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Google Calendar Sync Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.green.shade100.withValues(alpha: 0.5)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: const [
                              BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
                            ],
                          ),
                          child: const Icon(Icons.calendar_month, color: Colors.blue, size: 30),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Google Calendar Integration',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.darkBlue,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Sync your deadlines and events with Google Calendar',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () => _showManageBottomSheet(context, ref, googleSyncState, user),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppTheme.primary,
                            elevation: 1,
                            shadowColor: Colors.black12,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                              side: BorderSide(color: Colors.grey.shade200),
                            ),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('Manage', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              SizedBox(width: 2),
                              Icon(Icons.chevron_right, size: 14),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Soft Red Sign Out Row
                  InkWell(
                    onTap: () {
                      ref.read(authNotifierProvider.notifier).logout();
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.red.shade100, width: 1.5),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.logout, color: Colors.red.shade700),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Text(
                              'Sign Out',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.red.shade700,
                              ),
                            ),
                          ),
                          Icon(Icons.chevron_right, color: Colors.red.shade700),
                        ],
                      ),
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

  Widget _buildDetailField(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: AppTheme.primary, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.darkBlue,
                  ),
                ),
              ],
            ),
          ),
          InkWell(
            onTap: () async {
              final scaffoldMessenger = ScaffoldMessenger.of(context);
              await Clipboard.setData(ClipboardData(text: value));
              scaffoldMessenger.showSnackBar(
                SnackBar(
                  content: Text('$label copied to clipboard!'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.blue.shade50.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.blue.shade50),
              ),
              child: Icon(Icons.copy, color: AppTheme.primary, size: 18),
            ),
          ),
        ],
      ),
    );
  }

  void _showManageBottomSheet(
    BuildContext context,
    WidgetRef ref,
    GoogleConsentState googleSyncState,
    dynamic user,
  ) {
    if (!googleSyncState.connected) {
      // Connect Flow
      final userId = user?.id;
      if (userId != null) {
        final url = Uri.parse('${AppConstants.baseUrl}/auth/google/connect?userId=$userId');
        launchUrl(url, mode: LaunchMode.externalApplication).then((success) {
          if (success) {
            Future.delayed(const Duration(seconds: 5), () {
              ref.read(googleSyncProvider.notifier).fetchConsentStatus();
            });
          }
        });
      }
      return;
    }

    // Settings sheet for connected state
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Consumer(
          builder: (context, ref, _) {
            final syncState = ref.watch(googleSyncProvider);
            return Container(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Manage Sync Settings',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.darkBlue,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const Divider(),
                  const SizedBox(height: 12),
                  SwitchListTile(
                    title: const Text('Sync Calendar Events', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                    subtitle: const Text('Sync in-app schedule & deadlines to Google Calendar', style: TextStyle(fontSize: 12)),
                    contentPadding: EdgeInsets.zero,
                    value: syncState.syncCalendar,
                    activeThumbColor: AppTheme.primary,
                    onChanged: syncState.isLoading
                        ? null
                        : (val) async {
                            await ref.read(googleSyncProvider.notifier).updateConsentSettings(
                                  syncGmail: syncState.syncGmail,
                                  syncCalendar: val,
                                );
                          },
                  ),
                  SwitchListTile(
                    title: const Text('Sync Gmail Extractor', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                    subtitle: const Text('Extract deadlines automatically from academic emails', style: TextStyle(fontSize: 12)),
                    contentPadding: EdgeInsets.zero,
                    value: syncState.syncGmail,
                    activeThumbColor: AppTheme.primary,
                    onChanged: syncState.isLoading
                        ? null
                        : (val) async {
                            await ref.read(googleSyncProvider.notifier).updateConsentSettings(
                                  syncGmail: val,
                                  syncCalendar: syncState.syncCalendar,
                                );
                          },
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.error,
                        side: const BorderSide(color: AppTheme.error),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: syncState.isLoading
                          ? null
                          : () async {
                              Navigator.pop(ctx);
                              await ref.read(googleSyncProvider.notifier).disconnect();
                            },
                      child: const Text('Disconnect Google Account', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
