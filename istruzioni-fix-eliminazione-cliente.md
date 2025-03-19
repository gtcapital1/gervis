# Istruzioni per la correzione dell'eliminazione dei clienti

Questo documento contiene le istruzioni per applicare la correzione che risolve il problema dell'eliminazione dei clienti nell'ambiente AWS.

## 1. Problema risolto

Il problema riguarda l'impossibilità di eliminare i clienti nell'ambiente AWS a causa di permessi database insufficienti e di gestione inadeguata della cascata di eliminazione per gli asset e le raccomandazioni associate.

## 2. Soluzioni implementate

1. **Miglioramento della gestione dell'eliminazione a cascata**:
   - La funzione `deleteClient` ora elimina prima tutti gli asset e le raccomandazioni associati al cliente
   - Aggiunta la gestione degli errori durante l'eliminazione

2. **Script di correzione dei permessi**:
   - Creato uno script per concedere i permessi DELETE all'utente del database
   - Lo script concede permessi per le tabelle clients, assets e recommendations

## 3. Istruzioni per l'aggiornamento

### Passo 1: Carica i file sul server AWS

```bash
# Copia il pacchetto sul server
scp gervis-update-clientdelete-fix.tar.gz ubuntu@SERVER_IP:/tmp/

# Accedi al server
ssh ubuntu@SERVER_IP

# Estrai il pacchetto nella directory dell'applicazione
cd /var/www/gervis
sudo tar -xzf /tmp/gervis-update-clientdelete-fix.tar.gz
```

### Passo 2: Applica la correzione dei permessi

```bash
# Esegui lo script di correzione dei permessi
cd /var/www/gervis
sudo chmod +x fix-aws-delete-permissions.sh
sudo ./fix-aws-delete-permissions.sh
```

### Passo 3: Riavvia l'applicazione

```bash
# Riavvia l'applicazione per applicare le modifiche
sudo pm2 restart gervis
```

### Passo 4: Verifica la correzione

Accedi all'interfaccia web di Gervis e prova a eliminare un cliente. L'operazione dovrebbe ora completarsi con successo.

## 4. Rollback (in caso di problemi)

Se si verificassero problemi, è possibile ripristinare la versione precedente:

```bash
# Accedi al server
ssh ubuntu@SERVER_IP

# Ripristina la versione precedente dal backup
cd /var/www/gervis
sudo git checkout HEAD~1 -- server/storage.ts

# Riavvia l'applicazione
sudo pm2 restart gervis
```

## 5. Note aggiuntive

- I log dell'applicazione si trovano in `/home/ubuntu/pm2/logs/gervis-error.0.log` e `/home/ubuntu/pm2/logs/gervis-out.0.log`
- In caso di problemi persistenti, controlla i log per dettagli specifici sull'errore