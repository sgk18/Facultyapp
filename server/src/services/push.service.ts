import { OneSignalClient } from '@/lib/onesignal';

export class PushNotificationService {
  /**
   * Sends a push notification to a single user
   */
  static async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    return OneSignalClient.sendPushNotification([userId], title, body, data);
  }

  /**
   * Sends a push notification to multiple users
   */
  static async sendPushToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    if (userIds.length === 0) return true;
    return OneSignalClient.sendPushNotification(userIds, title, body, data);
  }
}

export class ReminderPushService {
  /**
   * Generates localized matching push titles and body contents for different reminder intervals
   */
  static generatePushText(
    daysRemaining: number,
    deadlineTitle: string,
  ): { title: string; body: string } {
    let title = 'Upcoming Deadline';
    let body: string;

    if (daysRemaining === 7) {
      title = 'Deadline in 1 Week';
      body = `${deadlineTitle} is due in 7 days.`;
    } else if (daysRemaining === 6) {
      title = '6 Days Remaining';
      body = `${deadlineTitle} is due in 6 days.`;
    } else if (daysRemaining === 5) {
      title = '5 Days Remaining';
      body = `${deadlineTitle} is due in 5 days.`;
    } else if (daysRemaining === 4) {
      title = '4 Days Remaining';
      body = `${deadlineTitle} is due in 4 days.`;
    } else if (daysRemaining === 3) {
      title = 'Important Deadline Approaching';
      body = `${deadlineTitle} is due in 3 days.`;
    } else if (daysRemaining === 2) {
      title = '2 Days Remaining';
      body = `${deadlineTitle} is due in 2 days.`;
    } else if (daysRemaining === 1) {
      title = 'Deadline Tomorrow';
      body = `${deadlineTitle} is due tomorrow.`;
    } else if (daysRemaining === 0) {
      title = 'Deadline Due Today';
      body = `${deadlineTitle} is due today.`;
    } else if (daysRemaining < 0) {
      title = 'Deadline Overdue';
      body = `${deadlineTitle} is overdue. Please complete it as soon as possible.`;
    } else if (daysRemaining === 0.5) {
      title = 'Deadline in 12 Hours';
      body = `${deadlineTitle} is due in 12 hours.`;
    } else if (daysRemaining === 0.25) {
      title = 'Deadline in 6 Hours';
      body = `${deadlineTitle} is due in 6 hours.`;
    } else if (Math.abs(daysRemaining - 1 / 24) < 0.01) {
      title = 'Deadline in 1 Hour';
      body = `${deadlineTitle} is due in 1 hour.`;
    } else {
      body = `${deadlineTitle} is due soon.`;
    }

    return { title, body };
  }
}
