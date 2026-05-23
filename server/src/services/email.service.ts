import { EmailService as LibEmailService } from '@/lib/resend';

export class EmailService {
  /**
   * Dispatches an academic deadline reminder email
   */
  static async sendDeadlineReminder(
    to: string,
    facultyName: string,
    deadlineTitle: string,
    dueDateStr: string,
    description: string
  ): Promise<boolean> {
    return LibEmailService.sendDeadlineReminder(to, facultyName, deadlineTitle, dueDateStr, description);
  }
}
