class AppConstants {
  // API URL - change to your deployment or local IP when testing on physical devices
  static const String baseUrl = 'https://facultyappserver.vercel.app/api';

  // Secure Storage Keys
  static const String tokenKey = 'jwt_token';
  static const String refreshTokenKey = 'jwt_refresh_token';
  static const String userKey = 'user_data';

  // Supabase Config
  // Removed hardcoded credentials. Use build-time definitions instead:
  // flutter run --dart-define=SUPABASE_URL=YOUR_URL --dart-define=SUPABASE_ANON_KEY=YOUR_KEY
  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL', defaultValue: '');
  static const String supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');

  // Animation Durations
  static const Duration splashDelay = Duration(seconds: 2);
  static const Duration transitionDuration = Duration(milliseconds: 300);
}
