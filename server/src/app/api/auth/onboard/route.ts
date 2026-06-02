import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import { supabase } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication token missing');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Malformed authorization header');
  }

  // 1. Verify token with Supabase Auth
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new UnauthorizedError('Session validation failed against Supabase Auth');
  }

  const supabaseUser = data.user;
  const normalizedEmail = supabaseUser.email?.toLowerCase().trim() || '';

  if (!normalizedEmail) {
    throw new ValidationError('Authentication provider did not supply a valid email address');
  }

  // 2. Query internal database to see if profile already exists
  let dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { authUserId: supabaseUser.id },
        { email: normalizedEmail },
      ],
    },
    include: { department: true },
  });

  if (dbUser) {
    // Sync authUserId if not already mapped (e.g. legacy local account transitioning to Google Auth)
    if (!dbUser.authUserId) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { authUserId: supabaseUser.id },
        include: { department: true },
      });
    }

    // Enforce suspension check
    if (dbUser.isSuspended) {
      throw new ForbiddenError('This user account has been suspended by administration');
    }

    return sendSuccess(dbUser, 'User profile retrieved successfully');
  }

  // 3. New user registration check
  // Enforce CHRIST University email domain restriction
  const isApprovedDomain = normalizedEmail.endsWith('@christuniversity.in');
  if (!isApprovedDomain) {
    throw new ForbiddenError('Access restricted. Institutional @christuniversity.in email domain required.');
  }

  // Find or create default general department
  let department = await prisma.department.findFirst();
  if (!department) {
    department = await prisma.department.create({
      data: {
        name: 'General Faculty Department',
        code: 'GEN',
      },
    });
  }

  // Resolve default name from email prefix if metadata not present
  const emailPrefix = normalizedEmail.split('@')[0];
  const fallbackName = emailPrefix
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  const fullName = supabaseUser.user_metadata?.full_name || fallbackName || 'New Faculty Member';
  const avatarUrl = supabaseUser.user_metadata?.avatar_url || null;

  // Assign ADMIN role if it's the very first user on the platform, otherwise default to FACULTY
  const existingUsersCount = await prisma.user.count();
  const role = existingUsersCount === 0 ? 'ADMIN' : 'FACULTY';

  // Instantiate profile
  dbUser = await prisma.user.create({
    data: {
      authUserId: supabaseUser.id,
      email: normalizedEmail,
      fullName,
      avatarUrl,
      role,
      departmentId: department.id,
    },
    include: { department: true },
  });

  return sendSuccess(dbUser, 'User profile auto-created and onboarded successfully');
});
