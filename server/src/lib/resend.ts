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
      <div style="font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); box-sizing: border-box;">
        <!-- Header Bar -->
        <div style="background-color: #0147AD; padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">CHRIST Faculty Hub</h1>
          <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 14px;">Official Academic Notification</p>
        </div>
        
        <!-- Body Content -->
        <div style="padding: 32px 24px; background-color: #ffffff; color: #111827;">
          <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 16px; color: #111827;">Academic Deadline Reminder</h2>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Dear Prof. <strong>${facultyName}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">This is a reminder regarding an upcoming academic deadline in your department:</p>
          
          <!-- Deadline Details Card -->
          <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1.5px solid #DCDCDC; border-left: 4px solid #0147AD; margin-bottom: 28px;">
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #0147AD; font-weight: 700;">${deadlineTitle}</h3>
            <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5;"><strong style="color: #111827;">Due Date:</strong> ${dueDateStr}</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #6B7280;"><strong style="color: #111827;">Description:</strong> ${description}</p>
          </div>
          
          <!-- Action Button -->
          <div style="text-align: center; margin-bottom: 16px;">
            <a href="https://christuniversity.in" style="display: inline-block; background-color: #0147AD; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 15px; box-shadow: 0 4px 10px rgba(1, 71, 173, 0.2);">
              Access Faculty Portal
            </a>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; color: #6B7280; margin-top: 28px;">Please ensure all submissions or reviews are completed prior to the date indicated above.</p>
        </div>
        
        <!-- Footer Bar -->
        <div style="background-color: #DCDCDC; padding: 24px; text-align: center; color: #6B7280; font-size: 12px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 6px 0; font-weight: 600; color: #111827;">CHRIST (Deemed to be University)</p>
          <p style="margin: 0; line-height: 1.5;">This is an automated administrative notification.<br/>Please do not reply directly to this message.</p>
        </div>
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
