import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ForbiddenError } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { AuditService } from '@/services/audit.service';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const admin = await requireAuth(req);

  // Validate administrator privileges
  if (admin.role !== 'ADMIN') {
    throw new ForbiddenError('Administrator privileges required');
  }

  const logs = await AuditService.getAuditLogs();
  return sendSuccess(logs, 'Audit logs retrieved successfully');
});
