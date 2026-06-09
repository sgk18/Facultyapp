import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || '';
const fromEmail = process.env.FROM_EMAIL || 'CHRIST Faculty Hub <notifications@christuniversity.in>';

let resendInstance: Resend | null = null;
if (resendApiKey) {
  resendInstance = new Resend(resendApiKey);
}

export class TemplateService {
  /**
   * Generates a branded HTML template for CHRIST Faculty Hub emails
   */
  static generateHtml(params: {
    facultyName: string;
    deadlineTitle: string;
    dueDateStr: string;
    priority: string;
    departmentCode: string;
    messageText: string;
    urgencyColor: string;
    description: string;
  }): string {
    const {
      facultyName,
      deadlineTitle,
      dueDateStr,
      priority,
      departmentCode,
      messageText,
      urgencyColor,
      description,
    } = params;

    return `
      <div style="font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-sizing: border-box;">
        <!-- Header Bar -->
        <div style="background-color: #0147AD; padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">CHRIST Faculty Hub</h1>
          <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 14px;">Official Academic Notification</p>
        </div>
        
        <!-- Body Content -->
        <div style="padding: 32px 24px; background-color: #ffffff; color: #111827;">
          <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 16px; color: #111827;">Deadline Notice</h2>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Dear Prof. <strong>${facultyName}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px; color: #374151;">${messageText}</p>
          
          <!-- Deadline Details Card -->
          <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1.5px solid #E5E7EB; border-left: 5px solid ${urgencyColor}; margin-bottom: 28px;">
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 17px; color: #0147AD; font-weight: 700;">${deadlineTitle}</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #4B5563; width: 100px;"><strong>Due Date:</strong></td>
                <td style="padding: 4px 0; color: #111827;">${dueDateStr}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #4B5563;"><strong>Department:</strong></td>
                <td style="padding: 4px 0; color: #111827;">${departmentCode}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #4B5563;"><strong>Priority:</strong></td>
                <td style="padding: 4px 0; color: #111827;"><span style="background-color: ${urgencyColor}15; color: ${urgencyColor}; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">${priority}</span></td>
              </tr>
              ${description ? `
              <tr>
                <td style="padding: 8px 0 0 0; color: #4B5563; vertical-align: top;"><strong>Description:</strong></td>
                <td style="padding: 8px 0 0 0; color: #6B7280; line-height: 1.4;">${description}</td>
              </tr>` : ''}
            </table>
          </div>
          
          <!-- Action Button -->
          <div style="text-align: center; margin-bottom: 16px;">
            <a href="https://christuniversity.in" style="display: inline-block; background-color: #0147AD; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 15px; box-shadow: 0 4px 10px rgba(1, 71, 173, 0.2);">
              Access Faculty Portal
            </a>
          </div>
        </div>
        
        <!-- Footer Bar -->
        <div style="background-color: #F3F4F6; padding: 24px; text-align: center; color: #6B7280; font-size: 12px; border-top: 1px solid #E5E7EB;">
          <p style="margin: 0 0 6px 0; font-weight: 600; color: #111827;">CHRIST (Deemed to be University)</p>
          <p style="margin: 0; line-height: 1.5;">This is an automated administrative notification.<br/>Please do not reply directly to this message.</p>
        </div>
      </div>
    `;
  }
}

export class ReminderEmailService {
  /**
   * Dispatches a customized email reminder based on the remaining days
   */
  static async sendReminder(params: {
    to: string;
    facultyName: string;
    deadlineTitle: string;
    dueDateStr: string;
    priority: string;
    daysRemaining: number;
    departmentCode: string;
    description: string;
  }): Promise<boolean> {
    const {
      to,
      facultyName,
      deadlineTitle,
      dueDateStr,
      priority,
      daysRemaining,
      departmentCode,
      description,
    } = params;

    let subject = '';
    let messageText = '';
    let urgencyColor = '#0147AD'; // Default blue

    // 1. Determine Subject, Tone, and Accent Color based on Days Remaining
    if (daysRemaining === 7) {
      subject = `Upcoming Deadline: ${deadlineTitle}`;
      messageText = `You have 7 days remaining to complete your deadline. Please verify details and submit accordingly.`;
      urgencyColor = '#0147AD'; // Info Blue
    } else if (daysRemaining === 6) {
      subject = `Friendly Reminder: ${deadlineTitle} (6 Days Remaining)`;
      messageText = `This is a friendly reminder that you have 6 days remaining to complete this deadline.`;
      urgencyColor = '#2563EB'; // Light Blue
    } else if (daysRemaining === 5) {
      subject = `Upcoming Deadline Notice: ${deadlineTitle} (5 Days Remaining)`;
      messageText = `Please note that there are 5 days remaining to finish this task.`;
      urgencyColor = '#1D4ED8';
    } else if (daysRemaining === 4) {
      subject = `Reminder: ${deadlineTitle} (4 Days Remaining)`;
      messageText = `You have 4 days remaining for this deadline. Keep up the progress.`;
      urgencyColor = '#D97706'; // Orange-amber
    } else if (daysRemaining === 3) {
      subject = `Important Deadline Approaching: ${deadlineTitle}`;
      messageText = `Important reminder: This deadline is approaching in 3 days. Please review and ensure all criteria are met.`;
      urgencyColor = '#D97706'; // Urgent Orange
    } else if (daysRemaining === 2) {
      subject = `Urgent Reminder: ${deadlineTitle} (2 Days Remaining)`;
      messageText = `The deadline is approaching in 2 days. Action is highly recommended.`;
      urgencyColor = '#EA580C'; // Dark Orange
    } else if (daysRemaining === 1) {
      subject = `Deadline Tomorrow: ${deadlineTitle}`;
      messageText = `Urgent: This deadline is tomorrow. Please complete and submit it immediately.`;
      urgencyColor = '#DC2626'; // High Urgency Red
    } else if (daysRemaining === 0) {
      subject = `Deadline Due Today: ${deadlineTitle}`;
      messageText = `Critical: This deadline is due today. Immediate action is required to avoid missing the cutoff.`;
      urgencyColor = '#B91C1C'; // Critical Dark Red
    } else if (daysRemaining < 0) {
      subject = `Deadline Overdue: ${deadlineTitle}`;
      messageText = `Critical Alert: This deadline is now overdue. If you have not completed it, please take immediate action.`;
      urgencyColor = '#7F1D1D'; // Overdue Burgundy
    } else if (daysRemaining === 0.5) {
      subject = `Reminder: ${deadlineTitle} due in 12 hours`;
      messageText = `The deadline is due in 12 hours. Please check your submission.`;
      urgencyColor = '#EA580C';
    } else if (daysRemaining === 0.25) {
      subject = `Urgent: ${deadlineTitle} due in 6 hours`;
      messageText = `Urgent notification: Only 6 hours remaining to complete this deadline.`;
      urgencyColor = '#DC2626';
    } else if (Math.abs(daysRemaining - 1/24) < 0.01) {
      subject = `Final Warning: ${deadlineTitle} due in 1 hour`;
      messageText = `Final warning: The deadline is in 1 hour. Action is required immediately.`;
      urgencyColor = '#B91C1C';
    } else {
      subject = `Upcoming Deadline: ${deadlineTitle}`;
      messageText = `This is a reminder to complete your upcoming deadline.`;
      urgencyColor = '#0147AD';
    }

    // 2. Generate standard HTML payload
    const html = TemplateService.generateHtml({
      facultyName,
      deadlineTitle,
      dueDateStr,
      priority,
      departmentCode,
      messageText,
      urgencyColor,
      description,
    });

    // 3. Dispatch using Resend or fallback mock
    try {
      if (resendInstance) {
        await resendInstance.emails.send({
          from: fromEmail,
          to,
          subject,
          html,
        });
        console.log(`[Resend] Successfully sent reminder email to ${to} for deadline: "${deadlineTitle}" (subject: "${subject}")`);
        return true;
      } else {
        console.log(`[MOCK EMAIL] Sent to ${to}: Subject: "${subject}", Accent: ${urgencyColor}, Message: "${messageText}"`);
        return true;
      }
    } catch (err) {
      console.error(`Failed to dispatch email notification via Resend to ${to}:`, err);
      return false;
    }
  }
}
