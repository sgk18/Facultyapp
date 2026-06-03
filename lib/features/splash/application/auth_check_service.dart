import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../auth/domain/user_model.dart';

class AuthCheckService {
  final Ref _ref;

  AuthCheckService(this._ref);

  bool checkOnboardingComplete(UserModel user) {
    // If departmentId is null or empty, onboarding is considered incomplete
    return user.departmentId != null && user.departmentId!.isNotEmpty;
  }
}

final authCheckServiceProvider = Provider<AuthCheckService>((ref) {
  return AuthCheckService(ref);
});
