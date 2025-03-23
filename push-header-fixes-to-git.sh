#!/bin/bash

# Script per inviare le correzioni al colore dell'header mobile al repository Git
# Questo script aggiunge, esegue commit e push delle modifiche al layout dell'header mobile

# Colori per i messaggi
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Aggiornamento repository Git con le correzioni all'header mobile...${NC}"

# Aggiungi i file modificati
git add client/src/components/advisor/Layout.tsx
echo -e "${GREEN}✓ File Layout.tsx aggiunto allo stage${NC}"

# Commit delle modifiche
git commit -m "Fix: Corretto colore titolo header mobile per componente Spark"
echo -e "${GREEN}✓ Commit creato con successo${NC}"

# Push delle modifiche
echo -e "${YELLOW}Invio modifiche al repository remoto...${NC}"
git push origin spark-update-20250323
echo -e "${GREEN}✓ Modifiche inviate con successo al branch spark-update-20250323${NC}"

echo -e "${GREEN}✓ Operazione completata con successo!${NC}"