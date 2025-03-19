#!/bin/bash

# Script per risolvere il problema del percorso della directory public
# Questo script crea un link simbolico dalla directory che il server si aspetta alla directory che viene effettivamente creata dalla build

set -e

# Cartella di base del progetto
BASE_DIR=$(pwd)
echo "Directory base: $BASE_DIR"

# Assicuriamoci che la build sia stata eseguita
if [ ! -d "$BASE_DIR/dist" ]; then
  echo "La directory dist non esiste. Eseguire prima la build."
  exit 1
fi

# Assicuriamoci che la directory dist/public esista
if [ ! -d "$BASE_DIR/dist/public" ]; then
  echo "La directory dist/public non esiste. Qualcosa è andato storto durante la build."
  exit 1
fi

# Crea un collegamento simbolico dalla posizione che il server sta cercando (server/public)
# alla posizione effettiva (dist/public)
mkdir -p "$BASE_DIR/server"
cd "$BASE_DIR/server"

# Se esiste già, rimuovi il link simbolico
if [ -L "public" ]; then
  echo "Rimozione del link simbolico esistente..."
  rm public
fi

# Se c'è una directory, renomina per sicurezza
if [ -d "public" ]; then
  echo "Backup della directory public esistente..."
  mv public public.backup
fi

# Crea il collegamento simbolico
echo "Creazione del collegamento simbolico da server/public a dist/public..."
ln -s "$BASE_DIR/dist/public" public

echo "Fatto! Il collegamento simbolico è stato creato."

# Controlliamo anche la directory in dist/
cd "$BASE_DIR/dist"

# Verifica se il collegamento simbolico del server esiste
if [ ! -d "server" ]; then
  echo "Creazione della directory server in dist/ se necessario..."
  mkdir -p server
fi

# Anche qui creiamo un collegamento public
cd "$BASE_DIR/dist/server"
if [ ! -L "public" ]; then
  ln -s "$BASE_DIR/dist/public" public
  echo "Creato anche un collegamento in dist/server/public"
fi

echo "Controllo finale dei percorsi:"
echo "server/public -> $(readlink -f $BASE_DIR/server/public)"
echo "dist/server/public -> $(readlink -f $BASE_DIR/dist/server/public)"