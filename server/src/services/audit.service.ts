import { prisma } from '@/lib/prisma';

export class AuditService {
  /**
   * Inserts an admin action audit log entry.
   */
  static async logAction(adminId: string, action: string, targetUser?: string) {
    try {
      return await prisma.auditLog.create({
        data: {
          adminId,
          action,
          targetUser: targetUser || null,
        },
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Suppress audit log writing errors to keep main transaction processing alive
      return null;
    }
  }

  /**
   * Fetches audit log records, ordered by newest first.
   */
  static async getAuditLogs(limit = 100) {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }
}
