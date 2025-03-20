/**
 * Fix per la funzione sendOnboardingEmail per supportare il parametro customSubject
 * 
 * Modifiche apportate:
 * 1. Aggiunto parametro customSubject alla definizione della funzione
 * 2. Aggiunto log di debug per il parametro customSubject
 * 3. Implementata logica per utilizzare customSubject come oggetto dell'email quando fornito
 */

export async function sendOnboardingEmail(
  clientEmail,
  firstName,
  lastName,
  onboardingLink,
  language = 'english',
  customMessage,
  advisorSignature,
  advisorEmail,
  customSubject
) {
  try {
    // Select content based on language
    const content = language === 'english' ? englishContent : italianContent;
    
    // Process custom message if provided
    // Remove salutations that might be duplicated in the email
    let processedMessage = customMessage || '';
    const greetingPatterns = [
      /^(gentile|egregio|caro|cara|spettabile)\s+.*?,/i,
      /^(dear|hello|hi)\s+.*?,/i
    ];
    
    for (const pattern of greetingPatterns) {
      processedMessage = processedMessage.replace(pattern, '');
    }
    
    processedMessage = processedMessage.trim();
    
    // Add advisor signature if provided
    let signatureHtml = '';
    if (advisorSignature) {
      signatureHtml = `
        <div style="margin-top: 20px; font-style: italic;">
          ${advisorSignature}
        </div>
      `;
    }
    
    // Generate HTML content
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2a5885;">${content.onboarding.greeting} ${firstName} ${lastName},</h2>
        
        <p>${content.onboarding.intro}</p>
        
        ${processedMessage ? `<p>${processedMessage}</p><br/>` : ''}
        
        <p>${content.onboarding.instructions}</p>
        
        <p style="margin: 30px 0; text-align: center;">
          <a href="${onboardingLink}" 
             style="background-color: #2a5885; 
                    color: white; 
                    padding: 12px 20px; 
                    text-decoration: none; 
                    border-radius: 4px; 
                    font-weight: bold;
                    display: inline-block;">
            ${content.onboarding.buttonText}
          </a>
        </p>
        
        <p>${content.onboarding.linkInstructions}</p>
        <p><a href="${onboardingLink}">${onboardingLink}</a></p>
        
        <p>${content.onboarding.expiryNote}</p>
        
        <p>${content.onboarding.closing}</p>
        
        <p>Gervis Team</p>
        
        ${signatureHtml}
      </div>
    `;
  
    // CORRETTO: Rispetta la scelta dell'utente per l'oggetto dell'email
    console.log("DEBUG - sendOnboardingEmail - customSubject originale:", customSubject);
    
    // Utilizziamo prioritariamente il valore fornito dall'utente, con fallback solo se vuoto
    const emailSubject = customSubject && customSubject.trim().length > 0 
      ? customSubject 
      : content.onboarding.subject;
      
    console.log("DEBUG - OGGETTO FINALE USATO (scelto dall'utente o fallback):", emailSubject);
    
    // Costruiamo interamente l'oggetto email per evitare problemi
    const mailOptions = {
      from: `"Gervis" <${emailConfig.from}>`,
      to: clientEmail,
      subject: emailSubject,
      html: html
    };
    
    // Se c'è un advisorEmail, lo aggiungiamo come CC
    if (advisorEmail) {
      console.log("DEBUG - Aggiunto CC a:", advisorEmail);
      mailOptions.cc = advisorEmail;
    }
    
    console.log("DEBUG - Mail options complete:", JSON.stringify(mailOptions, null, 2));
    
    await transporter.sendMail(mailOptions);
    
    console.log(`Onboarding email sent to ${clientEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send onboarding email:', error);
    throw error;
  }
}