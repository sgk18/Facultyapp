import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-at-least-32-chars-long';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  departmentId: string;
}

/**
 * Verifies the authentication state of an incoming request.
 * Resolves to the authenticated user's database profile, or null if invalid.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return null;
  }

  try {
    // 1. Verify token locally
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: Role;
    };

    if (!decoded || !decoded.userId) {
      return null;
    }

    // 2. Fetch corresponding internal user record including role
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!dbUser) {
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      role: dbUser.role,
      departmentId: dbUser.departmentId,
    };
  } catch (error) {
    console.error('Authentication verification failed:', error);
    return null;
  }
}

