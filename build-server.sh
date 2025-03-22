#!/bin/bash
# Script per compilare solo il server, senza il frontend
# Utile per test rapidi

echo "===== BUILD SERVER ====="
echo "Compilazione del server Node.js..."

# Creiamo la directory dist se non esiste
mkdir -p dist

# Compiliamo solo la parte server con esbuild
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "===== BUILD COMPLETATO ====="
echo "File generato: dist/index.js"
echo "Per avviare: NODE_ENV=production node dist/index.js"