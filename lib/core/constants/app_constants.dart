class AppConstants {
  // API URL - change to your deployment or local IP when testing on physical devices
  static const String baseUrl = 'http://localhost:3000/api';

  // Secure Storage Keys
  static const String tokenKey = 'jwt_token';
  static const String refreshTokenKey = 'jwt_refresh_token';
  static const String userKey = 'user_data';

  // Animation Durations
  static const Duration splashDelay = Duration(seconds: 2);
  static const Duration transitionDuration = Duration(milliseconds: 300);
}
