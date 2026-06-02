import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { supabase } from './supabase';

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
 * Supports both local signature verification (for Admin credentials) and Supabase Auth token validation.
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

  // 1. Try local JWT verification first (e.g. legacy/admin credentials)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: Role;
    };

    if (decoded && decoded.userId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          role: dbUser.role,
          departmentId: dbUser.departmentId,
        };
      }
    }
  } catch (error) {
    // Not a valid local JWT, fall through to Supabase token verification
  }

  // 2. Try Supabase Auth verification
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) {
      const dbUser = await prisma.user.findUnique({
        where: { authUserId: data.user.id },
      });

      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          role: dbUser.role,
          departmentId: dbUser.departmentId,
        };
      }
    }
  } catch (error) {
    console.error('Supabase authentication verification failed:', error);
  }

  return null;
}

