import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin SDK initialized successfully');
    } else {
      console.warn(
        'Firebase credentials missing. Running in MOCK mode for push notifications.',
      );
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
}

export class NotificationService {
  /**
   * Send a push notification to a list of tokens or a single token
   */
  static async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    try {
      if (admin.apps.length > 0) {
        await admin.messaging().send({
          token,
          notification: {
            title,
            body,
          },
          data,
        });
        console.log(
          `Push notification sent successfully to token: ${token.substring(0, 10)}...`,
        );
        return true;
      } else {
        console.log(
          `[MOCK PUSH] Sent to "${token.substring(0, 10)}...": "${title}" - "${body}"`,
        );
        return true;
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Broadcast a notification to multiple tokens
   */
  static async broadcastPushNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<number> {
    if (tokens.length === 0) return 0;

    let successCount = 0;
    for (const token of tokens) {
      const success = await this.sendPushNotification(token, title, body, data);
      if (success) successCount++;
    }
    return successCount;
  }
}
