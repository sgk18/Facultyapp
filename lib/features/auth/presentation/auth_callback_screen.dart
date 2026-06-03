import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/custom_button.dart';
import '../../../core/widgets/glass_card.dart';
import 'auth_notifier.dart';

class AuthCallbackScreen extends HookConsumerWidget {
  final String? code;

  const AuthCallbackScreen({
    super.key,
    required this.code,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusMessage = useState('Completing sign in...');
    final errorMessage = useState<String?>(null);
    final hasExchanged = useRef(false);

    useEffect(() {
      if (hasExchanged.value) return null;
      hasExchanged.value = true;

      Future<void> runExchange() async {
        try {
          final authCode = code;
          if (authCode == null || authCode.trim().isEmpty) {
            throw 'Missing authentication authorization code. Please try signing in again.';
          }

          statusMessage.value = 'Completing sign in...';
          
          // 1. Exchange PKCE code for session
          await Supabase.instance.client.auth.exchangeCodeForSession(authCode);

          // 2. Wait for AuthNotifier state update & onboarding check
          statusMessage.value = 'Loading profile...';
          
          int checkCount = 0;
          while (context.mounted) {
            final authState = ref.read(authNotifierProvider);
            
            if (authState.errorMessage != null) {
              throw authState.errorMessage!;
            }
            
            if (authState.isAuthenticated) {
              statusMessage.value = 'Preparing dashboard...';
              break;
            }

            await Future.delayed(const Duration(milliseconds: 300));
            checkCount++;
            
            if (checkCount > 50) { // 15s timeout
              throw 'Authentication timed out. Please try signing in again.';
            }
          }
        } catch (e) {
          if (context.mounted) {
            errorMessage.value = e.toString();
          }
        }
      }

      runExchange();
      return null;
    }, [code]);

    final hasError = errorMessage.value != null;

    return Scaffold(
      body: Stack(
        children: [
          // Background Gradient (1/3 height)
          Container(
            height: MediaQuery.of(context).size.height * 0.38,
            decoration: const BoxDecoration(
              gradient: AppTheme.mainGradient,
            ),
          ),
          
          SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: GlassCard(
                  padding: const EdgeInsets.all(28),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (!hasError) ...[
                        const SizedBox(height: 16),
                        const CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(AppTheme.darkBlue),
                        ),
                        const SizedBox(height: 28),
                        Text(
                          statusMessage.value,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.darkBlue,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Securing your connection to the portal...',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.black45,
                          ),
                        ),
                        const SizedBox(height: 16),
                      ] else ...[
                        const Icon(
                          Icons.error_outline_rounded,
                          color: AppTheme.error,
                          size: 60,
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Authentication Failed',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.error,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          errorMessage.value!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.black87,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 28),
                        CustomButton(
                          text: 'Back to Login',
                          onPressed: () {
                            // Reset state error message to allow fresh retries
                            ref.read(authNotifierProvider.notifier).logout();
                            context.go('/login');
                          },
                          icon: Icons.arrow_back_rounded,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
