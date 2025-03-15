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
  subject: 'Complete Your Watson Financial Advisory Onboarding',
  title: 'Welcome to Watson Financial Advisory',
  greeting: (firstName: string, lastName: string) => `Dear ${firstName} ${lastName},`,
  invitation: 'Your financial advisor has invited you to complete your onboarding process. This includes a comprehensive suitability assessment to help us better understand your financial goals and risk tolerance.',
  callToAction: 'Please click the button below to start your onboarding process:',
  buttonText: 'Start Onboarding',
  expiry: 'This link will expire in 48 hours for security purposes.',
  questions: 'If you have any questions, please contact your financial advisor.',
  signature: 'Best regards,',
  team: 'Watson Financial Advisory Team'
};

// Italian content
const italianContent = {
  subject: 'Completa la tua procedura di onboarding con Watson Financial Advisory',
  title: 'Benvenuto a Watson Financial Advisory',
  greeting: (firstName: string, lastName: string) => `Gentile ${firstName} ${lastName},`,
  invitation: 'Il tuo consulente finanziario ti ha invitato a completare la procedura di onboarding. Ciò include una valutazione completa dell\'idoneità per aiutarci a comprendere meglio i tuoi obiettivi finanziari e la tua tolleranza al rischio.',
  callToAction: 'Fai clic sul pulsante qui sotto per iniziare la procedura di onboarding:',
  buttonText: 'Inizia Onboarding',
  expiry: 'Questo link scadrà tra 48 ore per motivi di sicurezza.',
  questions: 'In caso di domande, contatta il tuo consulente finanziario.',
  signature: 'Cordiali saluti,',
  team: 'Il Team di Watson Financial Advisory'
};

type EmailLanguage = 'english' | 'italian';

export async function sendOnboardingEmail(
  clientEmail: string,
  firstName: string,
  lastName: string,
  onboardingLink: string,
  language: EmailLanguage = 'english'
) {
  // Select content based on language
  const content = language === 'english' ? englishContent : italianContent;
  
  const html = `
    <h2>${content.title}</h2>
    <p>${content.greeting(firstName, lastName)}</p>
    <p>${content.invitation}</p>
    <p>${content.callToAction}</p>
    <div style="margin: 30px 0;">
      <a href="${onboardingLink}" 
         style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        ${content.buttonText}
      </a>
    </div>
    <p>${content.expiry}</p>
    <p>${content.questions}</p>
    <p>${content.signature}<br>${content.team}</p>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: clientEmail,
    subject: content.subject,
    html,
  });
}