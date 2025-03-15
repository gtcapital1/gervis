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

// English content
const englishContent = {
  subject: 'Complete Your Financial Advisory Onboarding',
  title: 'Welcome to Your Financial Journey',
  greeting: (firstName: string, lastName: string) => `Dear ${firstName} ${lastName},`,
  invitation: 'Your financial advisor has invited you to complete your onboarding process. This includes a comprehensive suitability assessment to help us better understand your financial goals and risk tolerance.',
  callToAction: 'Please click the button below to start your onboarding process:',
  buttonText: 'Start Onboarding',
  expiry: 'This link will expire in 7 days for security purposes.',
  questions: 'If you have any questions, please contact your financial advisor.',
  signature: 'Best regards,',
  team: 'Your Financial Advisory Team'
};

// Italian content
const italianContent = {
  subject: 'Completa la tua procedura di onboarding finanziario',
  title: 'Benvenuto nel tuo percorso finanziario',
  greeting: (firstName: string, lastName: string) => `Gentile ${firstName} ${lastName},`,
  invitation: 'Il tuo consulente finanziario ti ha invitato a completare la procedura di onboarding. Ciò include una valutazione completa dell\'idoneità per aiutarci a comprendere meglio i tuoi obiettivi finanziari e la tua tolleranza al rischio.',
  callToAction: 'Fai clic sul pulsante qui sotto per iniziare la procedura di onboarding:',
  buttonText: 'Inizia Onboarding',
  expiry: 'Questo link scadrà tra 7 giorni per motivi di sicurezza.',
  questions: 'In caso di domande, contatta il tuo consulente finanziario.',
  signature: 'Cordiali saluti,',
  team: 'Il Tuo Team di Consulenza Finanziaria'
};

type EmailLanguage = 'english' | 'italian';

export async function sendOnboardingEmail(
  clientEmail: string,
  firstName: string,
  lastName: string,
  onboardingLink: string,
  language: EmailLanguage = 'english',
  customMessage?: string
) {
  // Select content based on language
  const content = language === 'english' ? englishContent : italianContent;
  
  // Use custom message if provided, otherwise use default content
  const messageContent = customMessage 
    ? customMessage.split('\n').map(line => line ? `<p>${line}</p>` : '<br>').join('')
    : `<p>${content.invitation}</p>`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
      ${customMessage ? '' : `<h2 style="color: #0066cc;">${content.title}</h2>`}
      ${customMessage ? 
        `<p style="margin-bottom: 16px;">${content.greeting(firstName, lastName)}</p>` : 
        `<p style="margin-bottom: 16px;">${content.greeting(firstName, lastName)}</p>`
      }
      ${messageContent}
      ${customMessage ? 
        `<p style="margin-top: 20px;">${content.callToAction}</p>` : 
        `<p>${content.callToAction}</p>`
      }
      <div style="margin: 30px 0;">
        <a href="${onboardingLink}" 
           style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          ${content.buttonText}
        </a>
      </div>
      <p style="font-size: 14px; color: #666;">${content.expiry}</p>
      <p>${content.questions}</p>
      <p style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
        ${content.signature}<br>
        ${content.team}
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: clientEmail,
    subject: content.subject,
    html,
  });
}