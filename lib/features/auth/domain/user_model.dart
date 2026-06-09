class UserModel {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final String? departmentId;
  final String? departmentName;
  final String? avatarUrl;
  final String? supabaseUserId;
  final String? employeeCode;
  final bool notificationEnabled;
  final bool emailNotificationsEnabled;
  final bool pushNotificationsEnabled;
  final bool inAppNotificationsEnabled;
  final String reminderFrequency;

  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.departmentId,
    this.departmentName,
    this.avatarUrl,
    this.supabaseUserId,
    this.employeeCode,
    this.notificationEnabled = true,
    this.emailNotificationsEnabled = true,
    this.pushNotificationsEnabled = true,
    this.inAppNotificationsEnabled = true,
    this.reminderFrequency = 'ALL',
  });

  /// Returns the first two characters of the full name for avatar initials.
  String get initials {
    final parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return fullName.substring(0, fullName.length.clamp(0, 2)).toUpperCase();
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    // Support both camelCase (API layer) and snake_case (raw Prisma) keys
    final fullName = (json['fullName'] ?? json['full_name'] ?? 'Faculty Member') as String;
    final departmentId = json['departmentId'] as String? ??
        json['department_id'] as String? ??
        (json['department'] as Map<String, dynamic>?)?['id'] as String?;
    final departmentName = json['departmentName'] as String? ??
        json['department_name'] as String? ??
        (json['department'] as Map<String, dynamic>?)?['name'] as String?;
    final employeeCode = json['employeeCode'] as String? ?? json['employee_code'] as String?;

    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      fullName: fullName,
      role: json['role'] as String? ?? 'FACULTY',
      departmentId: departmentId,
      departmentName: departmentName,
      avatarUrl: json['avatarUrl'] as String? ?? json['avatar_url'] as String?,
      supabaseUserId: json['supabaseUserId'] as String? ?? json['supabase_user_id'] as String?,
      employeeCode: employeeCode,
      notificationEnabled: json['notificationEnabled'] as bool? ?? json['notification_enabled'] as bool? ?? true,
      emailNotificationsEnabled: json['emailNotificationsEnabled'] as bool? ?? json['email_notifications_enabled'] as bool? ?? true,
      pushNotificationsEnabled: json['pushNotificationsEnabled'] as bool? ?? json['push_notifications_enabled'] as bool? ?? true,
      inAppNotificationsEnabled: json['inAppNotificationsEnabled'] as bool? ?? json['in_app_notifications_enabled'] as bool? ?? true,
      reminderFrequency: json['reminderFrequency'] as String? ?? json['reminder_frequency'] as String? ?? 'ALL',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'role': role,
      'departmentId': departmentId,
      'departmentName': departmentName,
      'avatarUrl': avatarUrl,
      'supabaseUserId': supabaseUserId,
      'employeeCode': employeeCode,
      'notificationEnabled': notificationEnabled,
      'emailNotificationsEnabled': emailNotificationsEnabled,
      'pushNotificationsEnabled': pushNotificationsEnabled,
      'inAppNotificationsEnabled': inAppNotificationsEnabled,
      'reminderFrequency': reminderFrequency,
    };
  }
}
