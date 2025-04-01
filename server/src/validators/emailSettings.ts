interface EmailSettings {
  smtpHost: string;
  smtpPort: string | number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom?: string;
  smtpSecure: boolean;
}

export function validateEmailSettings(settings: EmailSettings): string | null {
  // Validazione host SMTP
  if (!settings.smtpHost || typeof settings.smtpHost !== 'string') {
    return 'L\'host SMTP è obbligatorio e deve essere una stringa';
  }

  // Validazione porta SMTP
  const port = Number(settings.smtpPort);
  if (isNaN(port) || port < 1 || port > 65535) {
    return 'La porta SMTP deve essere un numero valido tra 1 e 65535';
  }

  // Validazione utente SMTP
  if (!settings.smtpUser || typeof settings.smtpUser !== 'string') {
    return 'L\'utente SMTP è obbligatorio e deve essere una stringa';
  }

  // Validazione password SMTP
  if (!settings.smtpPass || typeof settings.smtpPass !== 'string') {
    return 'La password SMTP è obbligatoria e deve essere una stringa';
  }

  // Validazione email mittente (opzionale)
  if (settings.smtpFrom && typeof settings.smtpFrom === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(settings.smtpFrom)) {
      return 'L\'indirizzo email del mittente non è valido';
    }
  }

  // Validazione smtpSecure
  if (typeof settings.smtpSecure !== 'boolean') {
    return 'Il campo smtpSecure deve essere un booleano';
  }

  return null;
} 