import { NotificationService } from '@/lib/firebase';

export class FirebaseService {
  /**
   * Dispatches a push notification to a specific target token
   */
  static async sendPush(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    return NotificationService.sendPushNotification(token, title, body, data);
  }

  /**
   * Broadcasts push notifications to multiple target tokens
   */
  static async broadcastPush(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<number> {
    return NotificationService.broadcastPushNotification(
      tokens,
      title,
      body,
      data,
    );
  }
}
