/**
 * Fix per la gestione dell'invio email nell'API /api/clients/:id/onboarding-token
 * 
 * Modifiche apportate:
 * 1. Aggiunto parametro sendEmail nella definizione dell'API
 * 2. Sostituito if (customMessage) con if (sendEmail)
 * 3. Aggiunto customSubject come parametro nella chiamata a sendOnboardingEmail
 * 4. Aggiunto flag emailSent nella risposta JSON
 */

// Generate onboarding token and link for client
app.post('/api/clients/:id/onboarding-token', isAuthenticated, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const { language = 'italian', customMessage, customSubject, sendEmail = false } = req.body;
    
    if (isNaN(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID' });
    }
    
    // Get client from database
    const client = await storage.getClient(clientId);
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    // Check if this client belongs to the current advisor
    if (client.advisorId !== req.user?.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to generate token for this client' });
    }
    
    if (!client.email) {
      return res.status(400).json({ success: false, message: "Client has no email address" });
    }
    
    // Generate the onboarding token
    const token = await storage.generateOnboardingToken(
      clientId,
      language,
      customMessage,
      req.user.email
    );
    
    // Generate a link from the token
    const baseUrl = process.env.BASE_URL || `https://gervis.it`;
    const link = `${baseUrl}/onboarding?token=${token}`;
    
    // Invia l'email solo se il flag sendEmail è true
    if (sendEmail) {
      try {
        // Get advisor information
        const advisor = await storage.getUser(req.user.id);
        
        // Get client name parts
        const firstName = client.firstName || client.name.split(' ')[0];
        const lastName = client.lastName || client.name.split(' ').slice(1).join(' ');
        
        // Debug per l'oggetto email
        console.log("DEBUG - Invio email onboarding:");
        console.log("DEBUG - customSubject:", customSubject);
        
        // Send the onboarding email
        await sendOnboardingEmail(
          client.email,
          firstName,
          lastName,
          link,
          language,
          customMessage,
          advisor?.signature || undefined,
          advisor?.email,
          customSubject
        );
      } catch (emailError) {
        console.error("Failed to send onboarding email:", emailError);
        // We don't need to fail the whole request if just the email fails
      }
    }
    
    // Aggiungiamo il flag emailSent nella risposta
    res.json({ 
      success: true, 
      token,
      link,
      language,
      emailSent: sendEmail
    });
  } catch (error) {
    console.error('Error generating onboarding token:', error);
    res.status(500).json({ success: false, message: 'Failed to generate onboarding token', error: String(error) });
  }
});