enum SplashPhase {
  initializing,
  checkingSession,
  fetchingProfile,
  checkingOnboarding,
  success,
  error,
}

class SplashState {
  final SplashPhase phase;
  final double progress;
  final String statusMessage;
  final String? errorMessage;

  SplashState({
    required this.phase,
    required this.progress,
    required this.statusMessage,
    this.errorMessage,
  });

  factory SplashState.initial() {
    return SplashState(
      phase: SplashPhase.initializing,
      progress: 0.0,
      statusMessage: 'Starting authentication setup...',
    );
  }

  SplashState copyWith({
    SplashPhase? phase,
    double? progress,
    String? statusMessage,
    String? errorMessage,
  }) {
    return SplashState(
      phase: phase ?? this.phase,
      progress: progress ?? this.progress,
      statusMessage: statusMessage ?? this.statusMessage,
      errorMessage: errorMessage,
    );
  }
}
