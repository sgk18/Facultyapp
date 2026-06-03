import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'splash_controller.dart';
import 'widgets/animated_logo.dart';
import 'widgets/loading_state_view.dart';
import '../../../core/theme/app_theme.dart';

class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(splashControllerProvider);
    final controller = ref.read(splashControllerProvider.notifier);

    return Scaffold(
      body: Stack(
        children: [
          // Background Gradient
          Container(
            decoration: const BoxDecoration(
              gradient: AppTheme.mainGradient,
            ),
          ),
          // Subtle Academic Grid & Arc Painters
          Positioned.fill(
            child: CustomPaint(
              painter: SplashBackgroundPainter(),
            ),
          ),
          // Content
          SafeArea(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const SizedBox(height: 48), // Top Spacer
                  
                  // Center App Identity Branding
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const AnimatedLogo(),
                      const SizedBox(height: 28),
                      const Text(
                        'CHRIST Faculty',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 30,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 2.0,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'FACULTY PRODUCTIVITY PLATFORM',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.65),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 2.0,
                        ),
                      ),
                    ],
                  ),
                  
                  // Bottom Loading Status & University Crest Label
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      LoadingStateView(
                        state: state,
                        onRetry: () => controller.initialize(),
                      ),
                      const SizedBox(height: 48),
                      Text(
                        'CHRIST (DEEMED TO BE UNIVERSITY) • PORTAL SECURE',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.35),
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
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

class SplashBackgroundPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.02)
      ..strokeWidth = 1.0;

    // Draw grid overlay
    const double gridSize = 32.0;
    for (double x = 0; x < size.width; x += gridSize) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = 0; y < size.height; y += gridSize) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final circlePaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.02)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    // Draw abstract geometric arcs representing academic structures
    canvas.drawCircle(Offset(size.width * 0.9, size.height * 0.1), 180, circlePaint);
    canvas.drawCircle(Offset(size.width * 0.9, size.height * 0.1), 260, circlePaint);
    canvas.drawCircle(Offset(size.width * 0.1, size.height * 0.85), 220, circlePaint);
    canvas.drawCircle(Offset(size.width * 0.1, size.height * 0.85), 320, circlePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
