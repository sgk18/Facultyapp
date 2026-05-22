import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class GradientContainer extends StatelessWidget {
  final Widget? child;
  final double? width;
  final double? height;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final BorderRadius? borderRadius;

  const GradientContainer({
    super.key,
    this.child,
    this.width,
    this.height,
    this.padding,
    this.margin,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      padding: padding,
      margin: margin,
      decoration: BoxDecoration(
        gradient: AppTheme.mainGradient,
        borderRadius: borderRadius ?? BorderRadius.zero,
        boxShadow: AppTheme.premiumShadow,
      ),
      child: child,
    );
  }
}
