#!/bin/bash

# Script per il deployment di Gervis
# Questo script prepara il pacchetto per il deployment e aiuta a caricarlo su un server AWS

set -e  # Interrompi lo script in caso di errore

echo "=== Script di deployment Gervis ==="
echo "Questo script preparerà il pacchetto per il deployment"

# Controlla se npm è installato
if ! command -v npm &> /dev/null; then
  echo "npm non è installato. Installalo prima di procedere."
  exit 1
fi

# Controlla se git è installato
if ! command -v git &> /dev/null; then
  echo "git non è installato. Installalo prima di procedere."
  exit 1
fi

# Definisci le directory
TEMP_DIR="gervis-deploy"
PACKAGE_NAME="gervis-prod.tar.gz"

echo "Pulizia directory temporanee precedenti..."
rm -rf $TEMP_DIR
rm -f $PACKAGE_NAME

echo "Creazione directory temporanea per il deployment..."
mkdir -p $TEMP_DIR

echo "Costruzione dell'applicazione..."
npm run build

echo "Copiando i file necessari nella directory di deployment..."
# Copia i file di configurazione
cp package.json $TEMP_DIR/
cp package-lock.json $TEMP_DIR/
cp tsconfig.json $TEMP_DIR/
cp tailwind.config.ts $TEMP_DIR/
cp postcss.config.js $TEMP_DIR/
cp vite.config.ts $TEMP_DIR/
cp drizzle.config.*s* $TEMP_DIR/ 2>/dev/null || :

# Copia gli script di supporto
cp setup-shared-schema.sh $TEMP_DIR/ 2>/dev/null || :
cp create-env-file.sh $TEMP_DIR/ 2>/dev/null || :

# Copia la directory dist
cp -r dist $TEMP_DIR/

# Copia la directory shared
mkdir -p $TEMP_DIR/shared
cp -r shared/* $TEMP_DIR/shared/ 2>/dev/null || :

# Copia la directory deploy
mkdir -p $TEMP_DIR/deploy
cp -r deploy/* $TEMP_DIR/deploy/ 2>/dev/null || :

echo "Copia delle migrazioni se esistono..."
if [ -d "migrations" ]; then
  cp -r migrations $TEMP_DIR/
fi

echo "Creazione del file .env.production esempio..."
cat > $TEMP_DIR/.env.example << EOF
# Configurazione del database
DATABASE_URL=postgresql://gervisuser:password@localhost:5432/gervis

# Configurazione del server
NODE_ENV=production
PORT=3000
BASE_URL=https://tuo-dominio.com
SESSION_SECRET=string-segreta-molto-lunga-e-complessa

# Configurazione email
SMTP_HOST=smtp.esempio.com
SMTP_PORT=587
SMTP_USER=user@esempio.com
SMTP_PASS=password
SMTP_FROM=no-reply@tuo-dominio.com
EOF

echo "Creazione del pacchetto di deployment..."
tar -czf $PACKAGE_NAME -C $TEMP_DIR .

echo "Pulizia directory temporanea..."
rm -rf $TEMP_DIR

FILESIZE=$(du -h $PACKAGE_NAME | cut -f1)

echo "=== Deployment package creato con successo: $PACKAGE_NAME ($FILESIZE) ==="
echo ""
echo "Per deployare su un server AWS:"
echo "1. Trasferisci il pacchetto al server:"
echo "   scp -i chiave.pem $PACKAGE_NAME ec2-user@tuo-server.amazonaws.com:~/"
echo ""
echo "2. Sul server, estrai il pacchetto:"
echo "   mkdir -p /var/www/gervis"
echo "   tar -xzf ~/$PACKAGE_NAME -C /var/www/gervis"
echo ""
echo "3. Configura l'applicazione:"
echo "   cd /var/www/gervis"
echo "   ./create-env-file.sh"
echo "   npm ci --production"
echo ""
echo "4. Esegui le migrazioni del database:"
echo "   npm run db:push"
echo ""
echo "5. Avvia l'applicazione:"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "Per istruzioni più dettagliate, consulta AWS-DEPLOY-README.md"