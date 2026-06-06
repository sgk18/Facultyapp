class AppConstants {
  // API URL - change to your deployment or local IP when testing on physical devices
  static const String baseUrl = 'http://localhost:3000/api'; // Use http://localhost:3000/api for Windows/Web targets

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
