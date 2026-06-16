import { z } from 'zod';

export const deadlineSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title cannot exceed 200 characters')
    .refine(val => !/<[^>]*>/.test(val), 'HTML tags are not allowed'),
  description: z.string()
    .min(1, 'Description is required')
    .max(5000, 'Description cannot exceed 5000 characters')
    .refine(val => !/<[^>]*>/.test(val), 'HTML tags are not allowed'),
  dueDate: z.string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid due date format. Must be an ISO date string.',
    })
    .refine((val) => new Date(val) > new Date(), {
      message: 'Due date must be in the future',
    }),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  departmentId: z.string().uuid('Invalid department ID format'),
  isCompleted: z.boolean().default(false).optional(),
  status: z
    .enum(['ACTIVE', 'COMPLETED', 'CANCELLED'])
    .default('ACTIVE')
    .optional(),
  addToGoogleCalendar: z.boolean().optional(),
  reminderSettings: z.array(z.string()).optional(),
});

export type DeadlineInput = z.infer<typeof deadlineSchema>;
