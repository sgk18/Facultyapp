import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess, ForbiddenError } from '@/utils/errors';
import { requireAdmin } from '@/middleware/auth.middleware';
import { AuditService } from '@/services/audit.service';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const admin = await requireAdmin(req);

  const logs = await AuditService.getAuditLogs();
  return sendSuccess(logs, 'Audit logs retrieved successfully');
});
