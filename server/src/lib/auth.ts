import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { Role } from '@prisma/client';
import { supabase } from './supabase';

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
 * Uses Supabase JWT verification as the sole source of truth.
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
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) {
      const dbUser = await prisma.user.findUnique({
        where: { supabaseUserId: data.user.id },
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
