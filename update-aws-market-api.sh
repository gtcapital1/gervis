#!/bin/bash

# Script per aggiornare l'implementazione dell'API FMP in spark-controller.ts
# Questo script modifica Spark per utilizzare lo stesso metodo di Market per chiamare l'API FMP

# Colori per i messaggi
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Aggiornamento implementazione API FMP in spark-controller.ts...${NC}"

# Crea il file di patch
cat > spark-fmp-patch.diff << 'EOL'
--- server/spark-controller.ts	2025-03-23 20:48:00
+++ server/spark-controller.ts	2025-03-23 20:48:00
@@ -11,7 +11,7 @@
 import { Request, Response } from "express";
 import { storage } from "./storage";
 import { Client } from "@shared/schema";
-import OpenAI from "openai";
+import { fetchWithTimeout } from "./market-api";
 import fetch from "node-fetch";
 
 // Logger per debug
@@ -166,20 +166,11 @@
         // Utilizziamo l'endpoint FMP per le notizie finanziarie
         const apiUrl = `https://financialmodelingprep.com/api/v3/stock_news?limit=100&apikey=${apiKey}`;
         debug(`Fetching news from ${apiUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);
-        
-        // Gestiamo il timeout come in market-api.ts
-        const controller = new AbortController();
-        const timeoutId = setTimeout(() => controller.abort(), 15000);
-        
+
         try {
-          const response = await fetch(apiUrl, {
-            headers: {
-              'User-Agent': 'Mozilla/5.0 (compatible; Gervis/1.0)',
-              'Accept': 'application/json'
-            },
-            signal: controller.signal
-          });
-          
-          // Pulizia del timeout
-          clearTimeout(timeoutId);
+          // Utilizziamo la stessa funzione fetchWithTimeout usata in market-api.ts
+          debug("Using fetchWithTimeout from market-api.ts");
+          const response = await fetchWithTimeout(apiUrl);
+          debug(`News API response status: ${response.status}`);
           
           if (!response.ok) {
EOL

# Applica la patch
patch -p0 < spark-fmp-patch.diff

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Patch applicata con successo a spark-controller.ts${NC}"
else
  echo -e "\033[0;31m✗ Errore nell'applicazione della patch${NC}"
  exit 1
fi

# Aggiorna la definizione di fetchWithTimeout in market-api.ts per renderla esportabile
cat > market-api-patch.diff << 'EOL'
--- server/market-api.ts	2025-03-23 20:48:00
+++ server/market-api.ts	2025-03-23 20:48:00
@@ -30,7 +30,7 @@
 const cache: Record<string, {data: any, timestamp: number}> = {};
 
 // Funzione condivisa per fare fetch con timeout
-async function fetchWithTimeout(url: string, options: any = {}, timeout = 15000) {
+export async function fetchWithTimeout(url: string, options: any = {}, timeout = 15000) {
   try {
     console.log(`DEBUG-MARKET: Inizializzazione fetch con timeout ${timeout}ms - ${new Date().toISOString()}`);
     const controller = new AbortController();
EOL

# Applica la patch a market-api.ts
patch -p0 < market-api-patch.diff

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Patch applicata con successo a market-api.ts${NC}"
else
  echo -e "\033[0;31m✗ Errore nell'applicazione della patch a market-api.ts${NC}"
  exit 1
fi

# Commit delle modifiche
git add server/spark-controller.ts server/market-api.ts
git commit -m "Fix: Corretto problema 401 Unauthorized in Spark utilizzando fetchWithTimeout da market-api"

# Push delle modifiche
echo -e "${YELLOW}Invio modifiche al repository remoto...${NC}"
git push origin spark-update-20250323
echo -e "${GREEN}✓ Modifiche inviate con successo al branch spark-update-20250323${NC}"

echo -e "${GREEN}✓ Operazione completata con successo!${NC}"
echo -e "${YELLOW}NOTA: Eseguire 'npm run build' e riavviare il server su AWS per applicare le modifiche${NC}"