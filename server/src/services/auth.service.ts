import { supabase } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { UnauthorizedError } from '@/utils/errors';
import { LoginInput } from '@/validators/auth';

export class AuthService {
  /**
   * Signs in a user using Supabase Auth, retrieves/syncs their db profile,
   * and returns credentials and user details.
   */
  static async login(input: LoginInput) {
    const { email, password } = input;

    // 1. Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedError(error?.message || 'Invalid email or password');
    }

    // 2. Query our internal database profile
    let dbUser = await prisma.user.findUnique({
      where: { id: data.user.id },
      include: { department: true },
    });

    // Onboarding rule: Auto-create profile as FACULTY only if email ends with @christuniversity.in
    const isApprovedDomain = email.toLowerCase().endsWith('@christuniversity.in');

    if (!dbUser && isApprovedDomain) {
      // Find or create a default department
      let department = await prisma.department.findFirst();
      if (!department) {
        department = await prisma.department.create({
          data: {
            name: 'General Faculty Department',
            code: 'GEN',
          },
        });
      }

      dbUser = await prisma.user.create({
        data: {
          id: data.user.id,
          authUserId: data.user.id,
          email: data.user.email || email,
          fullName: data.user.user_metadata?.full_name || 'New Faculty Member',
          role: 'FACULTY',
          departmentId: department.id,
        },
        include: { department: true },
      });
    }

    // If profile still doesn't exist, reject access
    if (!dbUser) {
      throw new UnauthorizedError('Access restricted. Your account is not approved.');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: dbUser.role,
        department: dbUser.department,
      },
    };
  }

  /**
   * Logs out the session by signing out of Supabase Auth.
   */
  static async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    return true;
  }
}
