import express from 'express';
import { prisma } from '../db/client';
import { validateEmailSettings } from '../validators/emailSettings';

const router = express.Router();

// GET /api/settings/email - Recupera le impostazioni email dell'utente
router.get('/email', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const settings = await prisma.userEmailSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return res.status(404).json({ error: 'Impostazioni email non trovate' });
    }

    res.json(settings);
  } catch (error) {
    console.error('Errore nel recupero delle impostazioni email:', error);
    res.status(500).json({ error: 'Errore nel recupero delle impostazioni email' });
  }
});

// POST /api/settings/email - Salva le impostazioni email dell'utente
router.post('/email', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure } = req.body;

    // Validazione dei dati
    const validationError = validateEmailSettings({
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      smtpSecure,
    });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Aggiorna o crea le impostazioni email
    const settings = await prisma.userEmailSettings.upsert({
      where: { userId },
      update: {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpFrom,
        smtpSecure,
      },
      create: {
        userId,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpFrom,
        smtpSecure,
      },
    });

    res.json(settings);
  } catch (error) {
    console.error('Errore nel salvataggio delle impostazioni email:', error);
    res.status(500).json({ error: 'Errore nel salvataggio delle impostazioni email' });
  }
});

export default router; 