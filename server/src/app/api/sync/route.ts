import { NextRequest } from 'next/server';
import { withErrorHandler, sendSuccess } from '@/utils/errors';
import { requireAuth } from '@/middleware/auth.middleware';
import { SyncService } from '@/services/sync.service';

/**
 * POST trigger manual Gmail scanning and Calendar sync
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  // Trigger sync operations in parallel
  const [gmailResult, calendarResult] = await Promise.all([
    SyncService.syncGmailForUser(user.id),
    SyncService.syncCalendarForUser(user.id),
  ]);

  return sendSuccess(
    {
      gmail: gmailResult,
      calendar: calendarResult,
    },
    'Synchronization sync task completed successfully',
  );
});
