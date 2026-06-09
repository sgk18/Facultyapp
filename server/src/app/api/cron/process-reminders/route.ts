import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler, sendSuccess, UnauthorizedError } from '@/utils/errors';
import { ReminderEmailService } from '@/services/reminder.email.service';
import { PushNotificationService, ReminderPushService } from '@/services/push.service';

export const GET = withErrorHandler(async (req: NextRequest) => {
  // 1. Security Check: Enforce CRON_SECRET auth on production environments
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      throw new UnauthorizedError('Unauthorized trigger of background cron scheduler');
    }
  }

  const now = new Date();

  // 2. Fetch pending scheduled notifications whose scheduled time has arrived
  const pendingNotifications = await prisma.scheduledNotification.findMany({
    where: {
      status: 'pending',
      scheduledFor: {
        lte: now,
      },
    },
    include: {
      user: true,
      deadline: {
        include: {
          department: true,
        },
      },
    },
    take: 100, // Process in batches of 100 to prevent timeout
  });

  console.log(`[Cron Scheduler] Found ${pendingNotifications.length} pending reminder(s) to process`);

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const item of pendingNotifications) {
    const { user, deadline, channel } = item;

    // Check if deadline is no longer active
    if (!deadline || deadline.isCompleted || deadline.status !== 'ACTIVE') {
      // Cancel reminder since it is completed, cancelled, or missing
      await prisma.scheduledNotification.update({
        where: { id: item.id },
        data: { status: 'failed' },
      });
      skippedCount++;
      continue;
    }

    // Check if user is suspended or globally disabled notifications
    if (user.isSuspended || !user.notificationEnabled) {
      await prisma.scheduledNotification.update({
        where: { id: item.id },
        data: { status: 'failed' },
      });
      skippedCount++;
      continue;
    }

    // Calculate days remaining dynamically based on scheduledFor vs dueDate
    const diffTime = deadline.dueDate.getTime() - item.scheduledFor.getTime();
    // Convert ms to days. Math.round handles slight variations in timing.
    let daysRemaining = Math.round(diffTime / (24 * 60 * 60 * 1000));
    
    // Support fractions for hours (12h -> 0.5, 6h -> 0.25, 1h -> 1/24)
    const hoursRemaining = diffTime / (60 * 60 * 1000);
    if (Math.abs(hoursRemaining - 12) < 0.1) {
      daysRemaining = 0.5;
    } else if (Math.abs(hoursRemaining - 6) < 0.1) {
      daysRemaining = 0.25;
    } else if (Math.abs(hoursRemaining - 1) < 0.1) {
      daysRemaining = 1 / 24;
    }

    const formattedDueDate = new Date(deadline.dueDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    try {
      let success = false;

      if (channel === 'email') {
        // Enforce user email channel preference
        if (!user.emailNotificationsEnabled) {
          await prisma.scheduledNotification.update({
            where: { id: item.id },
            data: { status: 'failed' },
          });
          skippedCount++;
          continue;
        }

        success = await ReminderEmailService.sendReminder({
          to: user.email,
          facultyName: user.fullName,
          deadlineTitle: deadline.title,
          dueDateStr: formattedDueDate,
          priority: deadline.priority,
          daysRemaining,
          departmentCode: deadline.department.code,
          description: deadline.description,
        });

      } else if (channel === 'push') {
        // Enforce user push channel preference
        if (!user.pushNotificationsEnabled) {
          await prisma.scheduledNotification.update({
            where: { id: item.id },
            data: { status: 'failed' },
          });
          skippedCount++;
          continue;
        }

        const pushContent = ReminderPushService.generatePushText(daysRemaining, deadline.title);
        success = await PushNotificationService.sendPushToUser(
          user.id,
          pushContent.title,
          pushContent.body,
          {
            deadlineId: deadline.id,
            daysRemaining: String(daysRemaining),
          }
        );

      } else if (channel === 'in_app') {
        // Enforce user in-app channel preference
        if (!user.inAppNotificationsEnabled) {
          await prisma.scheduledNotification.update({
            where: { id: item.id },
            data: { status: 'failed' },
          });
          skippedCount++;
          continue;
        }

        // In-app does not need external API, we create DB record directly
        const pushContent = ReminderPushService.generatePushText(daysRemaining, deadline.title);
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: pushContent.title,
            body: pushContent.body,
            type: 'DEADLINE_REMINDER',
            relatedDeadlineId: deadline.id,
          },
        });
        success = true;
      }

      await prisma.scheduledNotification.update({
        where: { id: item.id },
        data: { status: success ? 'sent' : 'failed' },
      });

      if (success) {
        sentCount++;
      } else {
        failedCount++;
      }
    } catch (err) {
      console.error(`Error processing scheduled reminder ID ${item.id}:`, err);
      await prisma.scheduledNotification.update({
        where: { id: item.id },
        data: { status: 'failed' },
      });
      failedCount++;
    }
  }

  return sendSuccess({
    processed: pendingNotifications.length,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
  }, 'Scheduled reminders processed successfully');
});
