import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ValidationError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireRoles } from '@/middleware/role.middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createDepartmentSchema = z.object({
  name: z.string().min(3, 'Department name must be at least 3 characters long'),
  code: z
    .string()
    .min(2, 'Department code must be at least 2 characters long')
    .toUpperCase(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAuth(req);
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });
  return sendSuccess(departments, 'Departments retrieved successfully');
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);
  // Only admins can create new departments
  requireRoles(user, ['ADMIN']);

  const body = await req.json();
  const result = createDepartmentSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error.errors.map((e) => e.message),
    );
  }

  const { name, code } = result.data;

  // Check if name or code is already in use
  const existing = await prisma.department.findFirst({
    where: {
      OR: [{ name }, { code }],
    },
  });

  if (existing) {
    throw new ValidationError(
      'A department with this name or code already exists',
    );
  }

  const department = await prisma.department.create({
    data: { name, code },
  });

  return sendSuccess(department, 'Department created successfully', 201);
});
