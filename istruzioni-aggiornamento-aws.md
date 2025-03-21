# Istruzioni per l'aggiornamento in ambiente AWS

Questo documento descrive i passi da seguire per aggiornare Gervis all'ultima versione su AWS.

## Modifiche nell'ultimo aggiornamento

L'ultima versione include i seguenti miglioramenti:
- Layout migliorato della pagina dettaglio cliente
- Grafico radar posizionato a destra e più ampio (2/3 dello spazio)
- Sezione informazioni personali più stretta (1/3 dello spazio)
- Box asset con sfondo nero e testo bianco per migliore leggibilità
- Rimozione della scheda "assets" ridondante
- Correzione duplicazioni nelle sezioni investimento

## Metodo 1: Aggiornamento Rapido

Se hai accesso SSH al tuo server AWS:

1. Accedi al server via SSH:
   ```
   ssh ubuntu@IP_DEL_TUO_SERVER
   ```

2. Vai alla directory dell'applicazione:
   ```
   cd /var/www/gervis
   ```

3. Esegui lo script di aggiornamento (crea il file prima se non esiste):
   ```
   chmod +x pull-and-rebuild.sh && ./pull-and-rebuild.sh
   ```

## Metodo 2: Aggiornamento Manuale

Se preferisci eseguire manualmente i passaggi:

1. Accedi al server via SSH:
   ```
   ssh ubuntu@IP_DEL_TUO_SERVER
   ```

2. Vai alla directory dell'applicazione:
   ```
   cd /var/www/gervis
   ```

3. Scarica le ultime modifiche:
   ```
   git pull origin main
   ```

4. Pulisci la cache:
   ```
   rm -rf node_modules/.vite
   rm -rf client/node_modules/.vite
   rm -rf dist
   rm -rf client/dist
   ```

5. Reinstalla le dipendenze:
   ```
   npm install
   ```

6. Compila l'applicazione:
   ```
   npm run build
   ```

7. Riavvia l'applicazione con PM2:
   ```
   pm2 restart gervis
   ```

## Verifica dell'aggiornamento

Dopo l'aggiornamento, verifica che:

1. La pagina di dettaglio cliente mostri il nuovo layout con:
   - Informazioni personali in una colonna più stretta (1/3 di larghezza)
   - Grafico radar più ampio sulla destra (2/3 di larghezza)
   - Box asset con sfondo nero e testo bianco

2. Se le modifiche non sono visibili, prova a:
   - Svuotare la cache del browser (Ctrl+F5 o Cmd+Shift+R)
   - Verificare i log di PM2 per eventuali errori:
     ```
     pm2 logs gervis
     ```

## Supporto

In caso di problemi durante l'aggiornamento, contattare il supporto tecnico.