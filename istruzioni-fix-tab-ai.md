# Istruzioni per risolvere il problema di visibilità del tab AI

## Problema
Il tab "AI Profile" è già definito nel codice ma potrebbe non essere visibile nell'ambiente di produzione AWS a causa di:
1. File di componenti mancanti
2. Problemi con le traduzioni
3. Problemi con la compilazione o la cache

## Soluzione
È stato creato uno script `fix-ai-tab-visibility.sh` che:

1. Verifica l'esistenza della cartella dei componenti advisor
2. Verifica l'esistenza del file AiClientProfile.tsx
3. Crea o aggiorna i file di traduzione necessari
4. Ricompila l'applicazione
5. Riavvia i servizi

## Come applicare la correzione

### 1. Tramite il repository Git

```bash
# Sul server AWS
cd /var/www/gervis
git checkout ai-integration
git pull origin ai-integration
bash fix-ai-tab-visibility.sh
```

### 2. Manualmente (se Git non funziona)

1. Copia il contenuto del file `fix-ai-tab-visibility.sh` dal repository
2. Crea un nuovo file con lo stesso nome sul server AWS
3. Incolla il contenuto e salva
4. Esegui:
```bash
chmod +x fix-ai-tab-visibility.sh
bash fix-ai-tab-visibility.sh
```

## Verifica del funzionamento

Dopo aver applicato la correzione:

1. Accedi all'applicazione con un utente consulente
2. Vai alla pagina di dettaglio di un cliente
3. Scorri fino alla sezione inferiore
4. Dovresti vedere il tab "AI Profile" visibile e funzionante

Se persiste il problema, controlla i log di PM2:

```bash
pm2 logs
```

## Note aggiuntive

Lo script garantisce che tutte le chiavi di traduzione necessarie siano presenti sia in italiano che in inglese. Se si stanno utilizzando lingue personalizzate oltre a queste, potrebbe essere necessario aggiungere manualmente le traduzioni nei rispettivi file.