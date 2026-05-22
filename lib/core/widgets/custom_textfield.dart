import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import '../theme/app_theme.dart';

class CustomTextField extends HookWidget {
  final TextEditingController? controller;
  final String labelText;
  final String? hintText;
  final IconData? prefixIcon;
  final bool isPassword;
  final String? Function(String?)? validator;
  final TextInputType keyboardType;

  const CustomTextField({
    super.key,
    this.controller,
    required this.labelText,
    this.hintText,
    this.prefixIcon,
    this.isPassword = false,
    this.validator,
    this.keyboardType = TextInputType.text,
  });

  @override
  Widget build(BuildContext context) {
    final obscureText = useState(isPassword);

    return TextFormField(
      controller: controller,
      obscureText: obscureText.value,
      keyboardType: keyboardType,
      validator: validator,
      style: const TextStyle(fontSize: 16, color: Colors.black87),
      decoration: InputDecoration(
        labelText: labelText,
        hintText: hintText,
        prefixIcon: prefixIcon != null ? Icon(prefixIcon, color: AppTheme.primary) : null,
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(
                  obscureText.value ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  color: Colors.grey.shade600,
                ),
                onPressed: () => obscureText.value = !obscureText.value,
              )
            : null,
      ),
    );
  }
}
