import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || '';

let resendInstance: Resend | null = null;
if (resendApiKey) {
  resendInstance = new Resend(resendApiKey);
  console.log('Resend Email service initialized');
} else {
  console.warn('RESEND_API_KEY is missing. Running in MOCK mode for email dispatches.');
}

export class EmailService {
  /**
   * Send an email with deadline details
   */
  static async sendDeadlineReminder(
    to: string,
    facultyName: string,
    deadlineTitle: string,
    dueDateStr: string,
    description: string
  ): Promise<boolean> {
    const subject = `[CHRIST University] Academic Deadline Alert: ${deadlineTitle}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Academic Deadline Reminder</h2>
        <p>Dear Prof. ${facultyName},</p>
        <p>This is a reminder regarding an upcoming academic deadline:</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e3a8a;">${deadlineTitle}</h3>
          <p><strong>Due Date:</strong> ${dueDateStr}</p>
          <p><strong>Description:</strong> ${description}</p>
        </div>
        
        <p>Please ensure all submissions or reviews are completed before the deadline.</p>
        <p style="margin-top: 30px; font-size: 0.85em; color: #64748b;">
          CHRIST (Deemed to be University)<br/>
          This is an automated notification. Please do not reply directly.
        </p>
      </div>
    `;

    try {
      if (resendInstance) {
        await resendInstance.emails.send({
          from: 'CHRIST Faculty Hub <notifications@christuniversity.in>',
          to,
          subject,
          html: htmlContent,
        });
        console.log(`Email successfully dispatched to ${to} using Resend`);
        return true;
      } else {
        console.log(`[MOCK EMAIL] Sent to ${to}: "${subject}"`);
        return true;
      }
    } catch (error) {
      console.error(`Failed to dispatch email to ${to}:`, error);
      return false;
    }
  }
}
