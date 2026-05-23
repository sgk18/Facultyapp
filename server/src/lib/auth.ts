import { NextRequest } from 'next/server';
import { supabase } from './supabase';
import { prisma } from './prisma';
import { Role } from '@prisma/client';

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
    // 1. Verify token with Supabase Auth server
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    if (error || !supabaseUser) {
      return null;
    }

    // 2. Fetch corresponding internal user record including role
    const dbUser = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
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
