# ProGuard rules for Flutter Android builds

# Flutter wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# Sentry / Flutter integration
-keep class io.sentry.** { *; }

# Ignore warnings for missing Play Core classes (used by Flutter deferred components)
-dontwarn com.google.android.play.core.**