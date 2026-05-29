import { prisma } from '@/lib/prisma';
import { UnauthorizedError } from '@/utils/errors';
import { LoginInput } from '@/validators/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-at-least-32-chars-long';

export class AuthService {
  /**
   * Signs in a user using local credential check, retrieves/syncs their db profile,
   * and returns credentials and user details.
   */
  static async login(input: LoginInput) {
    const { email, password } = input;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Query our internal database profile by email
    let dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { department: true },
    });

    // Onboarding rule: Auto-create profile as FACULTY only if email ends with @christuniversity.in
    const isApprovedDomain = normalizedEmail.endsWith('@christuniversity.in');

    if (!dbUser) {
      if (isApprovedDomain) {
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

        const passwordHash = await bcrypt.hash(password, 10);
        
        // Auto-generate name from email prefix
        const namePrefix = normalizedEmail.split('@')[0];
        const fullName = namePrefix
          .split('.')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');

        dbUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            fullName: fullName || 'New Faculty Member',
            role: 'FACULTY',
            departmentId: department.id,
          },
          include: { department: true },
        });
      } else {
        throw new UnauthorizedError('Access restricted. Your account is not approved.');
      }
    } else {
      // User profile exists - check password
      if (dbUser.passwordHash) {
        const isMatch = await bcrypt.compare(password, dbUser.passwordHash);
        if (!isMatch) {
          throw new UnauthorizedError('Invalid email or password');
        }
      } else {
        // User exists but has no password hash set yet (e.g. legacy/sync trigger user)
        // Store password on their first login
        const passwordHash = await bcrypt.hash(password, 10);
        dbUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: { passwordHash },
          include: { department: true },
        });
      }
    }

    // 2. Generate local JWT
    const token = jwt.sign(
      {
        userId: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 3. Format payload to match Flutter client expectations (firstName, lastName, departmentId)
    const nameParts = dbUser.fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      accessToken: token,
      refreshToken: token, // Placeholder for refresh token
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName,
        lastName,
        role: dbUser.role,
        departmentId: dbUser.departmentId,
      },
    };
  }

  /**
   * Logs out the session. (Local sessions are stateless JWTs, so this is a no-op).
   */
  static async logout() {
    return true;
  }
}

