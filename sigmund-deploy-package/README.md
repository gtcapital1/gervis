# Pacchetto Aggiornamento Sigmund

Questo pacchetto contiene tutti i file necessari per aggiornare il sistema Sigmund (ex AI Profile) su AWS.

## Contenuto del pacchetto

- `update-ai-profiles-schema.sql` - Script SQL per aggiornare la struttura del database
- `deploy-sigmund-to-aws.sh` - Script di deployment per AWS (esegui questo)
- `update-and-deploy-sigmund.sh` - Script alternativo di deployment
- `istruzioni-deploy-sigmund-aws.md` - Istruzioni dettagliate per il deployment
- `server/ai/openai-service.ts` - Servizio OpenAI aggiornato
- `server/ai/profile-controller.ts` - Controller del profilo aggiornato
- `server/migrations/update-ai-profiles-structure.ts` - Migrazione TypeScript
- `client/src/components/advisor/AiClientProfile.tsx` - Componente UI aggiornato

## Guida rapida

1. Copia tutti i file in questo pacchetto nella directory `/var/www/gervis` sul server AWS
2. Rendi eseguibile lo script di deployment: `chmod +x deploy-sigmund-to-aws.sh`
3. Esegui lo script: `./deploy-sigmund-to-aws.sh`
4. Segui le istruzioni a schermo

Per istruzioni dettagliate, consulta il file `istruzioni-deploy-sigmund-aws.md`.

## Modifiche principali

- Formato raccomandazioni unificato (ex approfondimenti e suggerimenti)
- UI migliorata con stile nero/bianco/blu
- Rimozione intestazione superflua
- Ottimizzazione query database
- Prompt OpenAI migliorato per azioni concrete
