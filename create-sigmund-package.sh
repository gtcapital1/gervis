#!/bin/bash

# Script per creare un pacchetto completo di deployment per Sigmund
# Il pacchetto includerà tutti i file necessari per aggiornare il sistema su AWS

echo "===== CREAZIONE PACCHETTO SIGMUND PER GIT ====="

# Crea una directory temporanea
TEMP_DIR="sigmund-deploy-package"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR

# Copia tutti i file necessari nella directory temporanea
echo "Copiando i file necessari..."

# File SQL
cp update-ai-profiles-schema.sql $TEMP_DIR/

# Script di deployment
cp deploy-sigmund-to-aws.sh $TEMP_DIR/
cp update-and-deploy-sigmund.sh $TEMP_DIR/

# Istruzioni
cp istruzioni-deploy-sigmund-aws.md $TEMP_DIR/

# File sorgente
mkdir -p $TEMP_DIR/server/ai
mkdir -p $TEMP_DIR/server/migrations
mkdir -p $TEMP_DIR/client/src/components/advisor

cp server/ai/openai-service.ts $TEMP_DIR/server/ai/
cp server/ai/profile-controller.ts $TEMP_DIR/server/ai/
cp server/migrations/update-ai-profiles-structure.ts $TEMP_DIR/server/migrations/
cp client/src/components/advisor/AiClientProfile.tsx $TEMP_DIR/client/src/components/advisor/

# Crea file README nel pacchetto
cat > $TEMP_DIR/README.md << 'EOF'
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
EOF

# Aggiunge il pacchetto a Git
echo "Aggiungendo il pacchetto a Git..."
git add $TEMP_DIR

# Committo il pacchetto
git commit -m "Aggiunto pacchetto completo per deployment Sigmund su AWS"

# Push del pacchetto
echo "Eseguendo push su Git..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin $CURRENT_BRANCH

# Verifica lo stato
if [ $? -eq 0 ]; then
  echo "Push completato con successo!"
else
  echo "ERRORE: Push fallito. Prova a eseguire manualmente 'git push origin $CURRENT_BRANCH'."
  exit 1
fi

echo ""
echo "===== PACCHETTO CREATO CON SUCCESSO ====="
echo "Il pacchetto è stato creato nella directory '$TEMP_DIR' e caricato su Git."
echo "Per esportare il pacchetto, esegui: zip -r sigmund-deploy.zip $TEMP_DIR"
echo ""