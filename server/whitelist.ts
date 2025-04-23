// Lista di email che sono automaticamente approvate senza necessità di approvazione admin
export const whitelistedEmails: string[] = [
  "gianmarco.trapasso@gmail.com",
  "rsansone.eo@gmail.com",
  "roberto.rescina@gmail.com",
  "giammi.kr@gmail.com"
];

/**
 * Controlla se un'email è nella whitelist e può essere automaticamente approvata
 * @param email L'email da controllare
 * @returns true se l'email è nella whitelist, false altrimenti
 */
export function isEmailWhitelisted(email: string): boolean {
  if (!email) return false;
  return whitelistedEmails.includes(email.toLowerCase().trim());
} 