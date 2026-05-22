import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class CustomButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isFullWidth;
  final bool isGradient;
  final IconData? icon;

  const CustomButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.isFullWidth = true,
    this.isGradient = true,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    Widget buttonContent = Row(
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
      children: [
        if (isLoading)
          const SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          )
        else ...[
          if (icon != null) ...[
            Icon(icon, size: 20),
            const SizedBox(width: 8),
          ],
          Text(text),
        ],
      ],
    );

    if (isGradient && onPressed != null) {
      return Container(
        width: isFullWidth ? double.infinity : null,
        height: 56,
        decoration: BoxDecoration(
          gradient: AppTheme.mainGradient,
          borderRadius: BorderRadius.circular(14),
          boxShadow: AppTheme.premiumShadow,
        ),
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            foregroundColor: Colors.white,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          onPressed: isLoading ? null : onPressed,
          child: buttonContent,
        ),
      );
    }

    return SizedBox(
      width: isFullWidth ? double.infinity : null,
      height: 56,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        onPressed: (isLoading || onPressed == null) ? null : onPressed,
        child: buttonContent,
      ),
    );
  }
}
