import nodemailer from "nodemailer";

// Create a transporter using SMTP settings from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.SMTP_FROM || '"Snooker Platform" <noreply@example.com>';

/**
 * Sends a welcome email to a newly created umpire with their credentials.
 */
export async function sendUmpireWelcomeEmail(email: string, name: string, password: string) {
  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: "Welcome to Snooker Platform - Your Umpire Credentials",
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #1a73e8;">Welcome, ${name}!</h2>
        <p>You have been registered as an <strong>Umpire</strong> on the Snooker Platform.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Your Credentials:</strong></p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
        </div>
        <p>You can log in at <a href="${process.env.NEXTAUTH_URL}/login" style="color: #1a73e8;">${process.env.NEXTAUTH_URL}/login</a>.</p>
        <div style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 10px; border-radius: 5px; margin: 20px 0;">
          <strong>Important:</strong> Please change your password as soon as possible from your profile page.
        </div>
        <p>Best regards,<br>The Snooker Platform Team</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Umpire Welcome Email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending Umpire Welcome Email:", error);
    return { success: false, error };
  }
}

/**
 * Sends a notification email to an umpire when they are assigned to a match.
 */
export async function sendMatchAssignmentEmail(email: string, name: string, matchTitle: string, scheduledTime: string) {
  const date = new Date(scheduledTime).toLocaleString();
  
  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: `New Match Assignment: ${matchTitle}`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #1a73e8;">New Match Assigned</h2>
        <p>Hello ${name},</p>
        <p>You have been assigned as an umpire for the following match:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Match:</strong> ${matchTitle}</p>
          <p style="margin: 5px 0;"><strong>Scheduled Time:</strong> ${date}</p>
        </div>
        <p>Please log in to the platform to view the match details and prepare for umpiring.</p>
        <p>Best regards,<br>The Snooker Platform Team</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Match Assignment Email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending Match Assignment Email:", error);
    return { success: false, error };
  }
}
