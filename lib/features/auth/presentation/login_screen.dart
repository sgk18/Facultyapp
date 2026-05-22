import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/custom_button.dart';
import '../../../core/widgets/custom_textfield.dart';
import '../../../core/widgets/glass_card.dart';
import 'auth_notifier.dart';

class LoginScreen extends HookConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final emailController = useTextEditingController();
    final passwordController = useTextEditingController();
    final formKey = useMemoized(() => GlobalKey<FormState>());
    
    final authState = ref.watch(authNotifierProvider);
    final authNotifier = ref.read(authNotifierProvider.notifier);
    final isLoading = useState(false);

    Future<void> handleLogin() async {
      if (formKey.currentState?.validate() ?? false) {
        isLoading.value = true;
        final success = await authNotifier.login(
          emailController.text.trim(),
          passwordController.text,
        );
        isLoading.value = false;
        
        if (!success && context.mounted) {
          final errorMsg = ref.read(authNotifierProvider).errorMessage ?? 'Login failed';
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMsg),
              backgroundColor: AppTheme.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        }
      }
    }

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
          
          // Login Form Scrollable Body
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 40),
                  // Header Title
                  const Text(
                    'Welcome Back',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Sign in to access your Christ University Faculty Portal',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 48),
                  
                  // Login Box
                  Form(
                    key: formKey,
                    child: GlassCard(
                      padding: const EdgeInsets.all(28),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'Sign In',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.darkBlue,
                            ),
                          ),
                          const SizedBox(height: 24),
                          
                          CustomTextField(
                            controller: emailController,
                            labelText: 'Institutional Email',
                            hintText: 'name.lastname@christuniversity.in',
                            prefixIcon: Icons.email_outlined,
                            keyboardType: TextInputType.emailAddress,
                            validator: (val) {
                              if (val == null || val.isEmpty) {
                                return 'Email is required';
                              }
                              if (!val.contains('@')) {
                                return 'Please enter a valid email';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),
                          
                          CustomTextField(
                            controller: passwordController,
                            labelText: 'Password',
                            prefixIcon: Icons.lock_outlined,
                            isPassword: true,
                            validator: (val) =>
                                val == null || val.isEmpty ? 'Password is required' : null,
                          ),
                          const SizedBox(height: 12),
                          
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: () {},
                              child: const Text(
                                'Forgot Password?',
                                style: TextStyle(
                                  color: AppTheme.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          
                          CustomButton(
                            text: 'Login',
                            isLoading: isLoading.value,
                            onPressed: handleLogin,
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 40),
                  const Center(
                    child: Text(
                      'For account assistance, contact IT Support Department',
                      style: TextStyle(
                        color: Colors.black45,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
