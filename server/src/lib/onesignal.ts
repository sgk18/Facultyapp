const oneSignalAppId = process.env.ONESIGNAL_APP_ID || '';
const oneSignalRestApiKey = process.env.ONESIGNAL_REST_API_KEY || '';

if (oneSignalAppId && oneSignalRestApiKey) {
  console.log('OneSignal Push service initialized');
} else {
  console.warn(
    'ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY is missing. Running in MOCK mode for push notifications.',
  );
}

export class OneSignalClient {
  /**
   * Send a push notification to specific user IDs via external_id targeting
   */
  static async sendPushNotification(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    if (!oneSignalAppId || !oneSignalRestApiKey) {
      console.log(
        `[MOCK PUSH] Sent to users ${JSON.stringify(userIds)}: "${title}" - "${body}" (data: ${JSON.stringify(data)})`,
      );
      return true;
    }

    try {
      const response = await fetch(
        'https://onesignal.com/api/v1/notifications',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${oneSignalRestApiKey}`,
          },
          body: JSON.stringify({
            app_id: oneSignalAppId,
            headings: { en: title },
            contents: { en: body },
            // Target user external_id (which corresponds to our User.id)
            include_aliases: {
              external_id: userIds,
            },
            target_channel: 'push',
            // Include data payload if any
            data: data || {},
          }),
        },
      );

      const resBody = await response.json();
      if (!response.ok) {
        console.error('OneSignal REST API error response:', resBody);
        return false;
      }

      console.log(
        `OneSignal Push notification successfully queued for users: ${JSON.stringify(userIds)}`,
      );
      return true;
    } catch (error) {
      console.error(
        'Failed to dispatch push notification via OneSignal:',
        error,
      );
      return false;
    }
  }
}
