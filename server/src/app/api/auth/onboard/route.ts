import { NextRequest } from 'next/server';
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

  // Helper to extract trailing numbers as employeeCode
  const extractEmployeeCode = (fullNameStr: string) => {
    const match = fullNameStr.match(/(.*?)\s+(\d+)$/);
    if (match) {
      return {
        fullName: match[1].trim(),
        employeeCode: match[2].trim(),
      };
    }
    return {
      fullName: fullNameStr.trim(),
      employeeCode: null,
    };
  };

  // 2. Query internal database to see if profile already exists
  let dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { supabaseUserId: supabaseUser.id },
        { email: normalizedEmail },
      ],
    },
    include: { department: true },
  });

  if (dbUser) {
    const updateData: any = {};
    
    // Sync supabaseUserId if not already mapped
    if (dbUser.supabaseUserId !== supabaseUser.id) {
      updateData.supabaseUserId = supabaseUser.id;
    }

    // Check if the name in the database contains a trailing number and clean it up
    const { fullName: cleanName, employeeCode: extractedCode } = extractEmployeeCode(dbUser.fullName);
    if (extractedCode && (dbUser.fullName !== cleanName || dbUser.employeeCode !== extractedCode)) {
      updateData.fullName = cleanName;
      updateData.employeeCode = extractedCode;
    }

    if (Object.keys(updateData).length > 0) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: updateData,
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
  // Enforce CHRIST University email domain restriction (allowing subdomains like @bsccmh.christuniversity.in)
  const isApprovedDomain = normalizedEmail.endsWith('@christuniversity.in') || 
                           normalizedEmail.endsWith('.christuniversity.in');
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

  const rawFullName = supabaseUser.user_metadata?.full_name || fallbackName || 'New Faculty Member';
  const { fullName, employeeCode } = extractEmployeeCode(rawFullName);
  const avatarUrl = supabaseUser.user_metadata?.avatar_url || null;

  // Default role is FACULTY (Admin promotion must be manual)
  const role = 'FACULTY';

  // Instantiate profile
  dbUser = await prisma.user.create({
    data: {
      supabaseUserId: supabaseUser.id,
      email: normalizedEmail,
      fullName,
      employeeCode,
      avatarUrl,
      role,
      departmentId: department.id,
    },
    include: { department: true },
  });

  return sendSuccess(dbUser, 'User profile auto-created and onboarded successfully');
});
