import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendOnboardingEmail(
  clientEmail: string,
  firstName: string,
  lastName: string,
  onboardingLink: string
) {
  const html = `
    <h2>Welcome to Watson Financial Advisory</h2>
    <p>Dear ${firstName} ${lastName},</p>
    <p>Your financial advisor has invited you to complete your onboarding process. This includes a comprehensive suitability assessment to help us better understand your financial goals and risk tolerance.</p>
    <p>Please click the button below to start your onboarding process:</p>
    <div style="margin: 30px 0;">
      <a href="${onboardingLink}" 
         style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        Start Onboarding
      </a>
    </div>
    <p>This link will expire in 48 hours for security purposes.</p>
    <p>If you have any questions, please contact your financial advisor.</p>
    <p>Best regards,<br>Watson Financial Advisory Team</p>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: clientEmail,
    subject: 'Complete Your Watson Financial Advisory Onboarding',
    html,
  });
}