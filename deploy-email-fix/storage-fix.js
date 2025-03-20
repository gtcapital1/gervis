/**
 * Fix per il metodo generateOnboardingToken per supportare il parametro customSubject
 * 
 * Modifica:
 * Aggiunto parametro customSubject alla firma del metodo e aggiunto log di debug
 */

// Metodo modificato per la classe PostgresStorage
async generateOnboardingToken(clientId, language = 'english', customMessage, advisorEmail, customSubject) {
  // Log dei parametri ricevuti per facilitare il debug
  console.log("DEBUG Storage - generateOnboardingToken ricevuto questi parametri:");
  console.log(`DEBUG Storage - clientId: ${clientId}`);
  console.log(`DEBUG Storage - language: ${language}`);
  console.log(`DEBUG Storage - customMessage: ${customMessage || "(non specificato)"}`);
  console.log(`DEBUG Storage - advisorEmail: ${advisorEmail || "(non specificato)"}`);
  console.log(`DEBUG Storage - customSubject: ${customSubject || "(non specificato)"}`);
  
  const client = await this.getClient(clientId);
  if (!client) {
    throw new Error(`Client with id ${clientId} not found`);
  }
  
  // Generate a random token
  const token = randomBytes(16).toString('hex');
  
  // Set token expiry to 7 days from now
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  
  // Update client with token and expiry
  await this.updateClient(clientId, { 
    onboardingToken: token,
    tokenExpiry: expiry
  });
  
  return token;
}