#!/usr/bin/env node

/**
 * Script per correggere gli import con estensione .js errati nei file TypeScript
 * Rimuove .js dalle importazioni di pacchetti npm
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Trova tutti i file .ts nelle directory server e shared
const findTsFiles = () => {
  try {
    const output = execSync('find ./server ./shared -type f -name "*.ts"').toString();
    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Errore nella ricerca dei file:', error);
    return [];
  }
};

// Pacchetti npm comuni che non dovrebbero avere estensione .js
const npmPackages = [
  'express', 'axios', 'openai', 'postgres', 'drizzle-orm', 'dotenv', 'fs', 'path', 
  'url', 'http', 'nanoid', 'vite', 'zod', 'pg', 'drizzle-orm/postgres-js', 
  'drizzle-orm/expressions', 'drizzle-orm/sql', 'crypto', 'express-fileupload',
  'pdf-merger-js', 'pdf-lib', 'pdf-parse', 'pdfjs-dist', 'ical-generator',
  'pdfkit', 'jspdf', 'jspdf-autotable', 'react', 'react-dom', 'react-router-dom',
  'node-fetch', 'nodemailer'
];

// Regex per trovare gli import con estensione .js
const createImportRegex = (packageName) => {
  return new RegExp(`(import\\s+(?:.*\\s+from\\s+)?["'])${packageName}\\.js(["'])`, 'g');
};

// Processa un file e correggi gli import
const processFile = (filePath) => {
  try {
    console.log(`Processando ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Sostituisci tutti gli import errati
    npmPackages.forEach(pkg => {
      const regex = createImportRegex(pkg);
      if (regex.test(content)) {
        content = content.replace(regex, `$1${pkg}$2`);
        modified = true;
      }
    });

    // Salva il file se è stato modificato
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Corretto ${filePath}`);
    }
  } catch (error) {
    console.error(`Errore nel processare ${filePath}:`, error);
  }
};

// Funzione principale
const main = () => {
  const files = findTsFiles();
  console.log(`Trovati ${files.length} file TypeScript`);
  
  files.forEach(processFile);
  
  console.log('Completato!');
};

main(); 