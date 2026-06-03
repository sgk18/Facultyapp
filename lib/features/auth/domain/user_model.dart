class UserModel {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final String? departmentId;
  final String? avatarUrl;
  final String? supabaseUserId;

  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.departmentId,
    this.avatarUrl,
    this.supabaseUserId,
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

    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      fullName: fullName,
      role: json['role'] as String? ?? 'FACULTY',
      departmentId: departmentId,
      avatarUrl: json['avatarUrl'] as String? ?? json['avatar_url'] as String?,
      supabaseUserId: json['supabaseUserId'] as String? ?? json['supabase_user_id'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'role': role,
      'departmentId': departmentId,
      'avatarUrl': avatarUrl,
      'supabaseUserId': supabaseUserId,
    };
  }
}
