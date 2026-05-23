import { z } from 'zod';

export const pushTokenSchema = z.object({
  fcmToken: z.string().min(10, 'FCM token is too short or invalid'),
  platform: z.string().min(1, 'Platform is required'),
});

export type PushTokenInput = z.infer<typeof pushTokenSchema>;
