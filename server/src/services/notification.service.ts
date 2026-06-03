import { prisma } from '@/lib/prisma';
import { FirebaseService } from '@/services/firebase.service';
import { EmailService } from '@/services/email.service';
import { NotFoundError, ForbiddenError } from '@/utils/errors';

export class NotificationService {
  /**
   * Fetches notifications for a specific user
   */
  static async getNotificationsForUser(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      include: {
        relatedDeadline: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Marks a specific notification as read after validating ownership
   */
  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenError('You do not own this notification');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Marks all notifications of a user as read
   */
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Sends notifications via DB, FCM Push, and Email to all users in a department
   */
  static async notifyDepartment(params: {
    departmentId: string;
    title: string;
    body: string;
    deadlineTitle: string;
    dueDateStr: string;
    description: string;
    excludeUserId?: string;
    type?: string;
    relatedDeadlineId?: string;
  }) {
    const {
      departmentId,
      title,
      body,
      deadlineTitle,
      dueDateStr,
      description,
      excludeUserId,
      type = 'DEADLINE',
      relatedDeadlineId,
    } = params;

    // Find all users in the department
    const targetUsers = await prisma.user.findMany({
      where: { departmentId },
    });

    const activeUsers = excludeUserId
      ? targetUsers.filter((u) => u.id !== excludeUserId)
      : targetUsers;

    // Dispatch notifications to each user
    const dispatches = activeUsers.map(async (user) => {
      try {
        // 1. Create DB Notification record
        await prisma.notification.create({
          data: {
            userId: user.id,
            title,
            body,
            type,
            relatedDeadlineId,
          },
        });

        // 2. Send FCM Push if FCM token exists
        if (user.fcmToken) {
          await FirebaseService.broadcastPush([user.fcmToken], title, body, {
            type,
            deadlineTitle,
            relatedDeadlineId: relatedDeadlineId || '',
          });
        }

        // 3. Send email via Resend
        await EmailService.sendDeadlineReminder(
          user.email,
          user.fullName,
          deadlineTitle,
          dueDateStr,
          description
        );
      } catch (err) {
        // Log errors locally so a failure for one user doesn't crash dispatching to others
        console.error(`Failed to notify user ${user.id} (${user.email}):`, err);
      }
    });

    // Execute dispatches asynchronously in background
    Promise.all(dispatches).catch((err) => {
      console.error('Failure in department notification batch process:', err);
    });

    return { totalTargets: activeUsers.length };
  }

  /**
   * Sends notification via DB, FCM Push, and Email to a single user
   */
  static async notifySingleUser(params: {
    userId: string;
    title: string;
    body: string;
    deadlineTitle: string;
    dueDateStr: string;
    description: string;
    type?: string;
    relatedDeadlineId?: string;
  }) {
    const {
      userId,
      title,
      body,
      deadlineTitle,
      dueDateStr,
      description,
      type = 'DEADLINE',
      relatedDeadlineId,
    } = params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) return { success: false };

    try {
      // 1. Create DB Notification record
      await prisma.notification.create({
        data: {
          userId: user.id,
          title,
          body,
          type,
          relatedDeadlineId,
        },
      });

      // 2. Send FCM Push if FCM token exists
      if (user.fcmToken) {
        await FirebaseService.broadcastPush([user.fcmToken], title, body, {
          type,
          deadlineTitle,
          relatedDeadlineId: relatedDeadlineId || '',
        });
      }

      // 3. Send email via Resend
      await EmailService.sendDeadlineReminder(
        user.email,
        user.fullName,
        deadlineTitle,
        dueDateStr,
        description
      );
    } catch (err) {
      console.error(`Failed to notify user ${user.id} (${user.email}):`, err);
    }

    return { success: true };
  }
}

