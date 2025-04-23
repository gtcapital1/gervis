// Lista di email che sono automaticamente approvate senza necessità di approvazione admin
export const whitelistedEmails: string[] = [
  "gianmarco.trapasso@gmail.com",
  "rsansone.eo@gmail.com",
  "roberto.rescina@gmail.com",
  "gt@gervis.it"
];

/**
 * Controlla se un'email è nella whitelist e può essere automaticamente approvata
 * @param email L'email da controllare
 * @returns true se l'email è nella whitelist, false altrimenti
 */
export function isEmailWhitelisted(email: string): boolean {
  if (!email) {
    console.log("[Whitelist] Email vuota o non definita");
    return false;
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  console.log(`[Whitelist] Controllo whitelist per email: "${normalizedEmail}"`);
  console.log(`[Whitelist] Lista whitelist: ${JSON.stringify(whitelistedEmails)}`);
  
  const isWhitelisted = whitelistedEmails.includes(normalizedEmail);
  console.log(`[Whitelist] Email "${normalizedEmail}" ${isWhitelisted ? 'è' : 'non è'} nella whitelist`);
  
  return isWhitelisted;
} 