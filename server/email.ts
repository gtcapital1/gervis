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
  subject: 'Complete Your Financial Profile',
  title: 'Your Personal Financial Journey',
  greeting: (firstName: string, lastName: string) => `Dear ${firstName} ${lastName},`,
  invitation: 'I have personally invited you to complete our simple onboarding process. This quick assessment will help me better understand your unique financial situation and goals so I can provide you with truly personalized guidance.',
  callToAction: 'Please click the button below to complete your profile (it only takes about 5 minutes):',
  buttonText: 'Complete My Profile',
  expiry: 'This link will expire in 7 days for security purposes.',
  questions: 'If you have any questions, please feel free to contact me directly.',
  signature: 'Looking forward to our journey together,',
  team: 'Your Financial Advisor'
};

// Italian content
const italianContent = {
  subject: 'Completa il tuo Profilo Finanziario',
  title: 'Il tuo Percorso Finanziario Personale',
  greeting: (firstName: string, lastName: string) => `Gentile ${firstName} ${lastName},`,
  invitation: 'Ti ho personalmente invitato a completare la nostra semplice procedura di onboarding. Questa rapida valutazione mi aiuterà a comprendere meglio la tua situazione finanziaria e i tuoi obiettivi personali così da poterti fornire una consulenza davvero personalizzata.',
  callToAction: 'Per favore, clicca sul pulsante qui sotto per completare il tuo profilo (richiede solo circa 5 minuti):',
  buttonText: 'Completa il Mio Profilo',
  expiry: 'Questo link scadrà tra 7 giorni per motivi di sicurezza.',
  questions: 'Se hai domande, non esitare a contattarmi direttamente.',
  signature: 'Non vedo l\'ora di intraprendere questo percorso insieme,',
  team: 'Il Tuo Consulente Finanziario'
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