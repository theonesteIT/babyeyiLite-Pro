const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates (fixes chain error)
  },
});

/**
 * Send an onboarding invitation email to new staff
 */
async function sendStaffInvitation(email, firstName, lastName, staffId, username, password) {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const mailOptions = {
    from: process.env.SMTP_FROM || 'Smart Education <noreply@babyeyi.rw>',
    to: email,
    subject: `Invitation: Access your ${process.env.APP_NAME || 'Smart Education'} Staff Account`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px;">
        <h2 style="color: #1E3A5F;">Welcome to the Team, ${firstName}!</h2>
        <p>Your institutional staff account has been provisioned. You can now access the Smart Education platform using the credentials below:</p>
        
        <div style="background-color: #f4f6f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Institutional Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>System Username:</strong> ${username}</p>
          <p style="margin: 5px 0;"><strong>Staff ID:</strong> ${staffId}</p>
          <p style="margin: 5px 0;"><strong>Initial Password:</strong> <code style="background: #fff; padding: 2px 5px; border: 1px solid #ddd; border-radius: 4px;">${password}</code></p>
          <p style="margin: 10px 0 0 0; font-size: 13px; color: #555;"><em>Note: You can use either your Email or Username to log in.</em></p>
        </div>

        <p>For security reasons, we recommend that you change your password upon your first login.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #1E3A5F; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Portal</a>
        </div>
        
        <p style="color: #666; font-size: 12px;">If you have any issues logging in, please contact your school administrator.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 11px; text-align: center;">&copy; ${new Date().getFullYear()} Smart Education System. All rights reserved.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending invitation email to ${email}:`, error);
    return false;
  }
}

/**
 * Send a notification about a password reset/regenerated invitation
 */
async function sendStaffPasswordResend(email, firstName, username, newPassword) {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const mailOptions = {
    from: process.env.SMTP_FROM || 'Smart Education <noreply@babyeyi.rw>',
    to: email,
    subject: `Action Required: Your ${process.env.APP_NAME || 'Smart Education'} Account Credentials`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px;">
        <h2 style="color: #1E3A5F;">Credentials Updated</h2>
        <p>Hello ${firstName}, your account access has been reset. Your new login credentials are provided below:</p>
        
        <div style="background-color: #f4f6f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Registered Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Username:</strong> ${username}</p>
          <p style="margin: 5px 0;"><strong>New Password:</strong> <code style="background: #fff; padding: 2px 5px; border: 1px solid #ddd; border-radius: 4px;">${newPassword}</code></p>
          <p style="margin: 10px 0 0 0; font-size: 13px; color: #555;"><em>Note: You can use either your Email or Username to log in.</em></p>
        </div>

        <p>Please use these details to sign in. We recommend changing your password immediately after logging in.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #1E3A5F; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">Sign In to Portal</a>
        </div>
        
        <p style="color: #999; font-size: 11px; text-align: center;">&copy; ${new Date().getFullYear()} Smart Education System. All rights reserved.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Resend invitation email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending resend email to ${email}:`, error);
    return false;
  }
}

module.exports = {
  sendStaffInvitation,
  sendStaffPasswordResend,
};
