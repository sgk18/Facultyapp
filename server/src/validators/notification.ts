import { z } from 'zod';

export const pushTokenSchema = z.object({
  fcmToken: z.string().min(10, 'FCM token is too short or invalid'),
  deviceType: z.string().min(1, 'Device type is required'),
});

export type PushTokenInput = z.infer<typeof pushTokenSchema>;
