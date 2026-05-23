import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { NotificationService } from '@/services/notification.service';
import { UserService } from '@/services/user.service';
import { pushTokenSchema } from '@/validators/notification';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const notifications = await NotificationService.getNotificationsForUser(user.id);
  return sendSuccess(notifications, 'Notifications retrieved successfully');
});

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const body = await req.json();
  
  if (body.all === true) {
    const result = await NotificationService.markAllAsRead(user.id);
    return sendSuccess(result, 'All notifications marked as read');
  }
  
  if (!body.id) {
    throw new ValidationError('Notification ID or all: true is required');
  }
  
  const result = await NotificationService.markAsRead(body.id, user.id);
  return sendSuccess(result, 'Notification marked as read');
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const body = await req.json();
  const result = pushTokenSchema.safeParse(body);
  
  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error.errors.map((e) => e.message)
    );
  }
  
  const token = await UserService.registerPushToken(
    user.id,
    result.data.fcmToken,
    result.data.platform
  );
  return sendSuccess(token, 'Push token registered successfully');
});
