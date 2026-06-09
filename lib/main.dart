import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'core/constants/app_constants.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/services/local_notification_service.dart';

void main() async {
  await SentryFlutter.init(
    (options) {
      options.dsn =
          'https://ea33fb2e0f879ab2fdd3bf7b673e1e72@o4509442671968256.ingest.de.sentry.io/4509442684813392';

      // Enable automatic performance monitoring
      options.tracesSampleRate = 0.1;

      // Profile 5% of transactions for performance insights
      // ignore: experimental_member_use
      options.profilesSampleRate = 0.05;

      // Don't attach screenshots (privacy-safe for university platform)
      options.attachScreenshot = false;
    },
    appRunner: () async {
      WidgetsFlutterBinding.ensureInitialized();

      // Forward all unhandled Flutter framework errors to Sentry
      FlutterError.onError = (FlutterErrorDetails details) {
        Sentry.captureException(
          details.exception,
          stackTrace: details.stack,
        );
        // Also print to console during development
        FlutterError.presentError(details);
      };

      await Supabase.initialize(
        url: AppConstants.supabaseUrl,
        publishableKey: AppConstants.supabaseAnonKey,
      );
      await LocalNotificationService.initialize();

      // Auto-inject test user token in development
      try {
        const secureStorage = FlutterSecureStorage();
        final existingToken = await secureStorage.read(key: AppConstants.tokenKey);
        if (existingToken == null) {
          await secureStorage.write(
            key: AppConstants.tokenKey,
            value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNWM0OTYzMC0yOGJkLTRlYTgtODY2Ny0zZjkwYzdmZGU0YjMiLCJleHAiOjE4MTI1NTM0MjIsImlhdCI6MTc4MTAxNzQyMn0.YWh3GsHKmqH9pweDKYDg37ibtYbFFkHVVUbrVSmuqsY',
          );
          await secureStorage.write(
            key: AppConstants.userKey,
            value: '{"id":"f2bc4534-2099-43a4-b860-6ad676209cb7","email":"suryachalam.vm@bsccmh.christuniversity.in","fullName":"SURYACHALAM V M","role":"ADMIN","departmentId":"fe0023c7-b54b-4be6-a8f7-42d64a74de18","departmentName":"General Faculty Department","avatarUrl":"https://lh3.googleusercontent.com/a/ACg8ocIlmTVy2MgauC4WZFDOoA-nL2eoiaFcYI4hzH35k796Zs9H1oWX=s96-c","supabaseUserId":"d5c49630-28bd-4ea8-8667-3f90c7fde4b3","employeeCode":"2540146"}',
          );
        }
      } catch (e) {
        // Silently ignore storage injection errors
      }

      runApp(
        const ProviderScope(
          child: FacultyApp(),
        ),
      );
    },
  );
}

class FacultyApp extends ConsumerWidget {
  const FacultyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'CHRIST Faculty Hub',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }
}
