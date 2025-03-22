# Creazione backup della versione stabile

## Versione v1.0.0-stable-20250322

È stato creato un tag Git per marcare questa versione stabile del software. Questo tag può essere utilizzato per tornare a questa versione in caso di problemi futuri.

### Funzionalità incluse
- Gestione clienti e asset
- Sistema di autenticazione con email verification
- API finanziarie per dati di mercato
- Fix per ES Modules su AWS
- Gestione sicura dei valori numerici nelle API finanziarie

### Comandi per ripristinare questa versione
```bash
# Sul server AWS
cd /var/www/gervis
sudo git fetch --all --tags
sudo git checkout v1.0.0-stable-20250322
sudo chmod +x build-server.sh
sudo ./build-server.sh
sudo pm2 restart all
```

Data creazione backup: Sat 22 Mar 2025 02:47:12 PM UTC
