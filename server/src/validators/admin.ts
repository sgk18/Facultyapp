import { z } from 'zod';

export const userRoleUpdateSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

export type UserRoleUpdateInput = z.infer<typeof userRoleUpdateSchema>;
