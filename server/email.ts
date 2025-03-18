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
  title: '', // Removed per client request
  greeting: (firstName: string, lastName: string) => `Dear ${firstName} ${lastName},`,
  invitation: 'I have personally invited you to complete our simple onboarding process. This quick assessment will help me better understand your unique financial situation and goals so I can provide you with truly personalized guidance.',
  callToAction: 'Please click the button below to complete your profile (it only takes about 5 minutes):',
  buttonText: 'Complete My Profile',
  expiry: 'This link will expire in 7 days for security purposes.',
  questions: 'If you have any questions, please feel free to contact me directly.',
  signature: 'Warm regards,',
  team: 'Financial Advisor'
};

// Italian content
const italianContent = {
  subject: 'Completa il tuo Profilo Finanziario',
  title: '', // Removed per client request
  greeting: (firstName: string, lastName: string) => `Gentile ${firstName} ${lastName},`,
  invitation: 'Ti invito personalmente a completare la nostra semplice procedura iniziale. Questa breve valutazione mi permetterà di comprendere meglio la tua situazione finanziaria e i tuoi obiettivi, così da offrirti una consulenza realmente su misura per te.',
  callToAction: 'Per favore, clicca sul pulsante qui sotto per completare il tuo profilo (richiede solo circa 5 minuti):',
  buttonText: 'Completa il Mio Profilo',
  expiry: 'Questo link scadrà tra 7 giorni per motivi di sicurezza.',
  questions: 'Se hai domande, non esitare a contattarmi direttamente.',
  signature: 'Cordiali saluti,',
  team: 'Consulente Finanziario'
};

type EmailLanguage = 'english' | 'italian';

export async function sendCustomEmail(
  clientEmail: string,
  subject: string,
  message: string,
  language: EmailLanguage = 'english',
  attachments?: any[],
  advisorSignature?: string,
  advisorEmail?: string
) {
  try {
    const content = language === 'english' ? englishContent : italianContent;
    const signature = advisorSignature || content.team;
    
    // Verifica se il messaggio già contiene la firma dell'advisor
    const containsSignature = advisorSignature && message.includes(advisorSignature.split('\n')[0]);
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div style="white-space: pre-line;">${message}</div>
      </div>
    </body>
    </html>
    `;
    
    const mailOptions = {
      from: `"Gervis Financial" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: clientEmail,
      cc: advisorEmail,
      subject: subject,
      html: emailHtml,
      attachments: attachments || []
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${clientEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function sendOnboardingEmail(
  clientEmail: string,
  firstName: string,
  lastName: string,
  onboardingLink: string,
  language: EmailLanguage = 'english',
  customMessage?: string,
  advisorSignature?: string,
  advisorEmail?: string
) {
  // Select content based on language
  const content = language === 'english' ? englishContent : italianContent;
  
  // Process custom message if provided
  // Remove salutations that might be duplicated in the email
  let processedMessage = customMessage || '';
  const greetingPatterns = [
    new RegExp(`Dear\\s+${firstName}\\s+${lastName}`, 'i'),
    new RegExp(`Gentile\\s+${firstName}\\s+${lastName}`, 'i'),
    /^Dear\s+.*,/i,
    /^Gentile\s+.*,/i
  ];
  
  // Remove greeting lines from custom message to avoid duplication
  if (customMessage) {
    const messageLines = customMessage.split('\n');
    const filteredLines = messageLines.filter(line => {
      const trimmedLine = line.trim();
      return !greetingPatterns.some(pattern => pattern.test(trimmedLine));
    });
    processedMessage = filteredLines.join('\n');
  }
  
  // Format the message content with HTML paragraphs
  const messageContent = customMessage 
    ? processedMessage.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br>').join('')
    : `<p>${content.invitation}</p>`;
  
  // Prepare signature section
  const signatureHtml = advisorSignature 
    ? `<p style="margin-top: 30px;">${content.signature}</p>
       <p style="white-space: pre-line;">${advisorSignature}</p>`
    : `<p style="margin-top: 30px;">${content.signature}</p>
       <p>${content.team}</p>`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
      ${content.title ? `<h2 style="color: #0066cc;">${content.title}</h2>` : ''}
      <p style="margin-bottom: 16px;">${content.greeting(firstName, lastName)}</p>
      ${customMessage ? messageContent : `<p>${content.invitation}</p>`}
      <p style="margin-top: 20px;">${content.callToAction}</p>
      <div style="margin: 30px 0;">
        <a href="${onboardingLink}" 
           style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          ${content.buttonText}
        </a>
      </div>
      <p style="font-size: 14px; color: #666;">${content.expiry}</p>
      <p>${content.questions}</p>
      ${signatureHtml}
    </div>
  `;

  await transporter.sendMail({
    from: `"Gervis Financial" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: clientEmail,
    cc: advisorEmail,
    subject: content.subject,
    html,
  });
}