class AppConstants {
  // Define environment (default to 'development' for local testing)
  static const String environment = String.fromEnvironment('APP_ENV', defaultValue: 'development');

  static const String devBaseUrl = String.fromEnvironment('DEV_API_URL', defaultValue: "http://192.168.29.157:3000");
  static const String prodBaseUrl = String.fromEnvironment('PROD_API_URL', defaultValue: "https://facultyappserver.vercel.app");

  // API URL - dynamically selected based on environment
  static const String baseUrl = environment == 'production' ? prodBaseUrl : devBaseUrl;

  // Secure Storage Keys
  static const String tokenKey = 'jwt_token';
  static const String refreshTokenKey = 'jwt_refresh_token';
  static const String userKey = 'user_data';

  // Supabase Config
  static const String supabaseUrl = 'https://lhnkrauedvbedvpgugcm.supabase.co';
  static const String supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobmtyYXVlZHZiZWR2cGd1Z2NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTg2MjEsImV4cCI6MjA5NTAzNDYyMX0.W5d7MZ4d7Ed4hWGHhJLUFoDo8FJ5vk-vWjHCHy1BffQ';

  // Animation Durations
  static const Duration splashDelay = Duration(seconds: 2);
  static const Duration transitionDuration = Duration(milliseconds: 300);
}
