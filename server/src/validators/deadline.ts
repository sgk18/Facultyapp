import { z } from 'zod';

export const deadlineSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long'),
  description: z.string().min(1, 'Description is required'),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid due date format. Must be an ISO date string.',
  }),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  departmentId: z.string().uuid('Invalid department ID format'),
  isCompleted: z.boolean().default(false).optional(),
});

export type DeadlineInput = z.infer<typeof deadlineSchema>;
