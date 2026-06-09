import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError, ForbiddenError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { UserService } from '@/services/user.service';
import { z } from 'zod';

const updateProfileSchema = z.object({
  userId: z.string().uuid().optional(),
  fullName: z.string().min(2, 'Name must be at least 2 characters long').optional(),
  departmentId: z.string().uuid().optional(),
  role: z.enum(['ADMIN', 'HOD', 'FACULTY']).optional(),
  notificationEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  pushNotificationsEnabled: z.boolean().optional(),
  inAppNotificationsEnabled: z.boolean().optional(),
  reminderFrequency: z.string().optional(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  // Verify token
  await requireAuth(req);
  const users = await UserService.listUsers();
  return sendSuccess(users, 'Users list retrieved successfully');
});

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const activeUser = await requireAuth(req);
  const body = await req.json();
  const result = updateProfileSchema.safeParse(body);
  
  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error.errors.map((e) => e.message)
    );
  }
  
  const {
    userId,
    fullName,
    departmentId,
    role,
    notificationEnabled,
    emailNotificationsEnabled,
    pushNotificationsEnabled,
    inAppNotificationsEnabled,
    reminderFrequency,
  } = result.data;
  
  // Decide target user
  let targetUserId = activeUser.id;
  
  if (userId && userId !== activeUser.id) {
    // If modifying another user's profile, activeUser must be ADMIN
    if (activeUser.role !== 'ADMIN') {
      throw new ForbiddenError('Only administrators can modify other user profiles');
    }
    targetUserId = userId;
  }
  
  // If attempting to update role, must be ADMIN
  if (role && activeUser.role !== 'ADMIN') {
    throw new ForbiddenError('Only administrators can modify user roles');
  }
  
  const updatedUser = await UserService.updateProfile(targetUserId, {
    fullName,
    departmentId,
    role,
    notificationEnabled,
    emailNotificationsEnabled,
    pushNotificationsEnabled,
    inAppNotificationsEnabled,
    reminderFrequency,
  });
  
  return sendSuccess(updatedUser, 'User profile updated successfully');
});
