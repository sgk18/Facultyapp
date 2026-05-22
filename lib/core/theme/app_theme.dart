import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Brand Color Palette
  static const Color primary = Color(0xFF2563EB); // Royal Blue
  static const Color darkBlue = Color(0xFF1E3A8A); // Deep Navy
  static const Color lightBlue = Color(0xFF60A5FA); // Sky Blue
  static const Color white = Color(0xFFFFFFFF);
  
  static const Color background = Color(0xFFF8FAFC); // Very light blue-grey
  static const Color surface = Color(0xFFFFFFFF);
  static const Color error = Color(0xFFEF4444);

  // Main Gradient
  static const LinearGradient mainGradient = LinearGradient(
    colors: [
      Color(0xFF1E3A8A), // #1E3A8A
      Color(0xFF2563EB), // #2563EB
      Color(0xFF60A5FA), // #60A5FA
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    stops: [0.0, 0.5, 1.0],
  );

  // Soft Shadows
  static List<BoxShadow> softShadow = [
    BoxShadow(
      color: Colors.black.withOpacity(0.04),
      blurRadius: 16,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> premiumShadow = [
    BoxShadow(
      color: const Color(0xFF1E3A8A).withOpacity(0.08),
      blurRadius: 24,
      offset: const Offset(0, 8),
    ),
  ];

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: const ColorScheme.light(
        primary: primary,
        secondary: lightBlue,
        surface: surface,
        error: error,
      ),
      scaffoldBackgroundColor: background,
      textTheme: GoogleFonts.outfitTextTheme().copyWith(
        displayLarge: GoogleFonts.outfit(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: darkBlue,
        ),
        titleLarge: GoogleFonts.outfit(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: darkBlue,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.normal,
          color: Colors.black87,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.normal,
          color: Colors.black54,
        ),
      ),
      cardTheme: CardTheme(
        color: white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.shade200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.shade200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: error, width: 1),
        ),
        labelStyle: TextStyle(color: Colors.grey.shade500),
        floatingLabelStyle: const TextStyle(color: primary),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: GoogleFonts.outfit(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
