import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_card.dart';
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
    const departmentName = 'Department of Computer Science';
    final roleName = user?.role ?? 'FACULTY';

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'My Profile',
          style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.darkBlue),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Profile Card Header
            Center(
              child: Column(
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      gradient: AppTheme.mainGradient,
                      shape: BoxShape.circle,
                      boxShadow: AppTheme.premiumShadow,
                    ),
                    child: Center(
                      child: Text(
                        user?.initials ?? 'FC',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    facultyName,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.darkBlue,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    roleName,
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.5,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Profile info card details
             GlassCard(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Column(
                children: [
                  _buildProfileField(Icons.email_outlined, 'Email', facultyEmail),
                  const Divider(height: 1),
                  _buildProfileField(Icons.domain_outlined, 'Department', departmentName),
                  const Divider(height: 1),
                  _buildProfileField(Icons.shield_outlined, 'Portal Permissions', roleName),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Google Calendar Sync Card
            GlassCard(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.calendar_month, color: AppTheme.primary),
                      SizedBox(width: 8),
                      Text(
                        'Google Calendar Integration',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.darkBlue,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (googleSyncState.errorMessage != null) ...[
                    Text(
                      googleSyncState.errorMessage!,
                      style: const TextStyle(color: AppTheme.error, fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                  ],
                  if (!googleSyncState.connected) ...[
                    Text(
                      'Link your official institutional Google Calendar account to sync your academic deadlines and lecture reminders.',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 13, height: 1.4),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: googleSyncState.isLoading
                            ? null
                            : () async {
                                final userId = user?.id;
                                if (userId != null) {
                                  final url = Uri.parse('${AppConstants.baseUrl}/auth/google/connect?userId=$userId');
                                  if (await launchUrl(url, mode: LaunchMode.externalApplication)) {
                                    // Poll status or tell user to refresh
                                    Future.delayed(const Duration(seconds: 5), () {
                                      ref.read(googleSyncProvider.notifier).fetchConsentStatus();
                                    });
                                  }
                                }
                              },
                        icon: googleSyncState.isLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.link, color: Colors.white),
                        label: const Text(
                          'Connect Google Account',
                          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ),
                  ] else ...[
                    Text(
                      'Connected Account Sync Settings',
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                    ),
                    const SizedBox(height: 8),
                    SwitchListTile(
                      title: const Text('Sync Calendar Events', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                      subtitle: const Text('Sync in-app schedule & deadlines to Google Calendar', style: TextStyle(fontSize: 12)),
                      contentPadding: EdgeInsets.zero,
                      value: googleSyncState.syncCalendar,
                      activeThumbColor: AppTheme.primary,
                      onChanged: googleSyncState.isLoading
                          ? null
                          : (val) {
                              ref.read(googleSyncProvider.notifier).updateConsentSettings(
                                    syncGmail: googleSyncState.syncGmail,
                                    syncCalendar: val,
                                  );
                            },
                    ),
                    SwitchListTile(
                      title: const Text('Sync Gmail Extractor', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                      subtitle: const Text('Extract deadlines automatically from academic emails', style: TextStyle(fontSize: 12)),
                      contentPadding: EdgeInsets.zero,
                      value: googleSyncState.syncGmail,
                      activeThumbColor: AppTheme.primary,
                      onChanged: googleSyncState.isLoading
                          ? null
                          : (val) {
                              ref.read(googleSyncProvider.notifier).updateConsentSettings(
                                    syncGmail: val,
                                    syncCalendar: googleSyncState.syncCalendar,
                                  );
                            },
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        TextButton.icon(
                          onPressed: googleSyncState.isLoading
                              ? null
                              : () => ref.read(googleSyncProvider.notifier).fetchConsentStatus(),
                          icon: const Icon(Icons.refresh, size: 16),
                          label: const Text('Refresh Status'),
                        ),
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.error,
                            side: BorderSide(color: AppTheme.error.withValues(alpha: 0.3)),
                          ),
                          onPressed: googleSyncState.isLoading
                              ? null
                              : () {
                                  ref.read(googleSyncProvider.notifier).disconnect();
                                },
                          child: const Text('Disconnect Account'),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Logout Button
            SizedBox(
              width: double.infinity,
              height: 56,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: AppTheme.error.withValues(alpha: 0.5)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  foregroundColor: AppTheme.error,
                ),
                onPressed: () {
                  ref.read(authNotifierProvider.notifier).logout();
                },
                icon: const Icon(Icons.logout),
                label: const Text(
                  'Log Out from Portal',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileField(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.primary, size: 22),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.black45,
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
        ],
      ),
    );
  }
}
