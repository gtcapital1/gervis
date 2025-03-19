/**
 * Script temporaneo per aggiungere un endpoint di promozione ad admin
 * Questo script è inteso per essere utilizzato durante la configurazione iniziale
 */

import express from 'express';
import { storage } from "./storage";
import { comparePasswords, hashPassword } from "./auth";

const app = express();
app.use(express.json());

// Endpoint per promuovere un utente ad admin
app.post('/api/admin/promote', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Verifica che l'email sia quella autorizzata
    const isAdmin = await storage.isAdminEmail(email);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Email non autorizzata a diventare admin'
      });
    }
    
    // Trova l'utente
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }
    
    // Verifica la password
    const passwordMatch = await comparePasswords(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Password non valida'
      });
    }
    
    // Aggiorna il ruolo dell'utente e lo stato di approvazione
    const updatedUser = await storage.updateUser(user.id, {
      role: 'admin',
      approvalStatus: 'approved'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Utente promosso ad amministratore',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        approvalStatus: updatedUser.approvalStatus
      }
    });
  } catch (error) {
    console.error('Errore durante la promozione ad admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore server durante la promozione ad admin'
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server temporaneo avviato sulla porta ${PORT}`);
  console.log(`Per promuovere un utente ad admin, effettua una richiesta POST a http://localhost:${PORT}/api/admin/promote`);
  console.log('con il seguente corpo:');
  console.log(JSON.stringify({
    email: 'gianmarco.trapasso@gmail.com',
    password: 'password_utente'
  }, null, 2));
});