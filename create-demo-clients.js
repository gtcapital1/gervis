/**
 * Script per la creazione di 10 clienti dimostrativi con dati completi e log
 * 
 * Questo script crea 10 clienti con profili completi, inclusi:
 * - Dati personali
 * - Profilo di rischio
 * - Obiettivi di investimento
 * - Interessi personali
 * - Asset
 * - Log di interazione (chiamate, email, note, incontri)
 * 
 * Utilizzo:
 * - Eseguire da AWS con: node create-demo-clients.js
 * - Necessaria connessione al database PostgreSQL
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Configurazione database da variabili d'ambiente
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

// Costanti per la generazione dati
const RISK_PROFILES = ["conservative", "moderate", "balanced", "growth", "aggressive"];
const EXPERIENCE_LEVELS = ["none", "beginner", "intermediate", "advanced", "expert"];
const PERSONAL_INTERESTS = [
  "technology", "real_estate", "sustainability", "healthcare", 
  "finance", "entrepreneurship", "education", "travel", 
  "family_planning", "retirement", "tax_optimization", "international"
];
const INVESTMENT_GOALS = ["retirement", "wealth_growth", "income_generation", "capital_preservation", "estate_planning"];
const INVESTMENT_HORIZONS = ["short_term", "medium_term", "long_term"];
const ASSET_CATEGORIES = ["real_estate", "equity", "bonds", "cash", "private_equity", "venture_capital", "cryptocurrencies", "other"];
const LOG_TYPES = ["email", "note", "call", "meeting"];

// Funzione per generare un valore casuale da un array
const getRandomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Funzione per generare un array casuale di elementi da un array più grande
const getRandomItems = (array, min = 1, max = 3) => {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Funzione per generare una data casuale compresa tra due date
const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Funzione per generare una stringa casuale di lunghezza specificata
const generateRandomString = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Hash della password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Dati per la generazione di clienti realistici
const firstNames = [
  "Marco", "Roberta", "Luca", "Giulia", "Alessandro", "Francesca", 
  "Andrea", "Chiara", "Davide", "Valentina", "Paolo", "Elisa", 
  "Giuseppe", "Laura", "Antonio", "Sofia", "Giovanni", "Marta"
];

const lastNames = [
  "Rossi", "Bianchi", "Ferrari", "Esposito", "Romano", "Russo", 
  "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", 
  "Conti", "Mancini", "Costa", "Giordano", "Rizzo", "Lombardi"
];

const cities = [
  "Milano", "Roma", "Torino", "Napoli", "Firenze", "Bologna", 
  "Venezia", "Genova", "Verona", "Bari", "Palermo", "Catania"
];

const companyNames = [
  "TechSolutions", "FinanzaItaliana", "MediGroup", "EnergiaVerde", 
  "FoodItaly", "AutoElite", "ModeStyle", "CostruzioniModerne", 
  "ArteDesign", "TurismoPlus", "SpecialTech", "EcoFriendly"
];

const jobTitles = [
  "CEO", "CFO", "Direttore", "Manager", "Responsabile Marketing", 
  "Responsabile Vendite", "Ingegnere", "Consulente", "Analista", 
  "Architetto", "Avvocato", "Medico"
];

// Titoli per log tipo email
const emailSubjects = [
  "Riepilogo incontro di consulenza",
  "Aggiornamento portafoglio",
  "Opportunità di investimento",
  "Documentazione per nuovo prodotto finanziario",
  "Incontro trimestrale",
  "Strategie fiscali per fine anno",
  "Revisione piano finanziario",
  "Nuove opportunità di mercato",
  "Conferma appuntamento",
  "Richiesta informazioni"
];

// Contenuti brevi per i log
const noteContents = [
  "Cliente interessato a investimenti tecnologici. Monitorare settore tech.",
  "Situazione patrimoniale in fase di consolidamento. Considerare diversificazione.",
  "Preoccupato per l'inflazione. Discutere strategie di protezione del capitale.",
  "Sta valutando l'acquisto di un immobile. Preparare simulazione mutuo.",
  "Pianificazione pensionistica prioritaria. Analizzare opzioni Pilastro 3.",
  "Ha menzionato l'interesse per investimenti ESG. Preparare materiale.",
  "In attesa di eredità importante. Discutere strategie di investimento appropriate.",
  "Richiesto aggiornamento su mercati emergenti. Preparare report.",
  "Priorità sulla protezione del capitale. Considerare obbligazioni e prodotti a basso rischio.",
  "Interessato a diversificare con investimenti internazionali."
];

// Contenuti completi per le email
const emailContents = [
  `Gentile Cliente,

Come discusso durante il nostro recente incontro, allego il riepilogo delle strategie di investimento che abbiamo analizzato. In particolare, abbiamo identificato alcune opportunità nel settore tecnologico che potrebbero essere interessanti per il suo profilo.

Rimango a disposizione per qualsiasi chiarimento.

Cordiali saluti`,

  `Buongiorno,

Desidero informarla che è disponibile l'aggiornamento trimestrale del suo portafoglio. I rendimenti sono in linea con le aspettative, con una performance particolarmente positiva degli investimenti nel settore sanitario.

Se desidera approfondire l'analisi, sono disponibile per un incontro.

Cordiali saluti`,

  `Gentile Cliente,

In seguito all'analisi del suo profilo di investimento, ho individuato alcune opportunità che potrebbero essere di suo interesse, in particolare nel settore immobiliare e delle energie rinnovabili.

Mi piacerebbe discuterne con lei. Potrebbe indicarmi alcune date in cui sarebbe disponibile per un breve incontro?

Cordiali saluti`,

  `Gentile Cliente,

Come richiesto, le invio la documentazione relativa al nuovo fondo di investimento specializzato in tecnologie innovative. Il fondo ha una strategia di medio-lungo termine e un profilo di rischio moderato, in linea con le sue preferenze.

Sono a disposizione per analizzare insieme la documentazione.

Cordiali saluti`,

  `Buongiorno,

In vista della fine dell'anno, sarebbe utile programmare un incontro per rivedere la strategia fiscale e ottimizzare la posizione rispetto agli investimenti in essere.

Potremmo anche valutare eventuali aggiustamenti del portafoglio in base alle nuove condizioni di mercato.

Cordiali saluti`
];

// Contenuti per i log delle chiamate
const callContents = [
  "Discussa situazione del portafoglio attuale. Cliente soddisfatto dei rendimenti.",
  "Chiamata per aggiornare su nuove opportunità nel settore tech. Interessato a maggiori informazioni.",
  "Richiesta informazioni su prodotti a basso rischio. Preoccupato per volatilità mercati.",
  "Discussione su pianificazione pensionistica. Fissato appuntamento per analisi dettagliata.",
  "Aggiornamento su investimenti immobiliari. Sta valutando acquisto seconda casa."
];

// Contenuti per i log degli incontri
const meetingContents = [
  "Incontro di revisione portafoglio trimestrale. Presentate performance e nuove strategie. Cliente interessato ad aumentare esposizione su tecnologia.",
  "Analisi dettagliata della situazione patrimoniale. Identificati obiettivi a breve e medio termine. Preparare piano di investimento personalizzato.",
  "Presentazione strategie di diversificazione. Cliente interessato a bond corporate e mercati emergenti. Da valutare allocazione specifica.",
  "Pianificazione successoria e protezione patrimoniale. Discusso utilizzo strumenti assicurativi e trust. Cliente richiede proposta dettagliata.",
  "Incontro conoscitivo. Raccolte informazioni su situazione attuale, obiettivi e propensione al rischio. Preparare proposta di consulenza."
];

// Funzione principale per generare e inserire clienti casuali
async function generateDemoClients() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('Connessione al database stabilita');
    
    // Recupera l'advisor ID (useremo il primo amministratore trovato)
    const advisorResult = await client.query(`
      SELECT id FROM users WHERE role = 'admin' LIMIT 1
    `);
    
    if (advisorResult.rows.length === 0) {
      throw new Error('Nessun amministratore trovato nel database');
    }
    
    const advisorId = advisorResult.rows[0].id;
    console.log(`Advisor ID: ${advisorId}`);
    
    // Genera e inserisci 10 clienti
    for (let i = 0; i < 10; i++) {
      const firstName = getRandomItem(firstNames);
      const lastName = getRandomItem(lastNames);
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@example.com`;
      const phone = `+39${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
      
      // Crea il tax code (versione semplificata del codice fiscale)
      const taxCode = `${lastName.substring(0, 3).toUpperCase()}${firstName.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
      
      // Genera profilo cliente
      const address = `Via ${getRandomItem(["Roma", "Milano", "Venezia", "Torino", "Napoli", "Firenze"])} ${Math.floor(Math.random() * 100) + 1}, ${getRandomItem(cities)}`;
      const company = getRandomItem(companyNames);
      const jobTitle = getRandomItem(jobTitles);
      const birthDate = getRandomDate(new Date(1960, 0, 1), new Date(2000, 0, 1)).toISOString().split('T')[0];
      const riskProfile = getRandomItem(RISK_PROFILES);
      const experienceLevel = getRandomItem(EXPERIENCE_LEVELS);
      const personalInterests = getRandomItems(PERSONAL_INTERESTS, 2, 5);
      const investmentGoals = getRandomItems(INVESTMENT_GOALS, 1, 3);
      const investmentHorizon = getRandomItem(INVESTMENT_HORIZONS);
      const income = Math.floor(Math.random() * 150000) + 50000;
      const netWorth = Math.floor(Math.random() * 5000000) + 100000;
      const hashedPassword = await hashPassword("password123");
      
      // Inserisci cliente
      const clientResult = await client.query(`
        INSERT INTO clients (
          name, firstName, lastName, email, phone, address, taxCode, 
          company, jobTitle, birthDate, riskProfile, experienceLevel, 
          personalInterests, investmentGoals, investmentHorizon, 
          income, netWorth, password, advisorId, isOnboarded, createdAt, isArchived
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING id
      `, [
        `${firstName} ${lastName}`, firstName, lastName, email, phone, address, taxCode,
        company, jobTitle, birthDate, riskProfile, experienceLevel,
        personalInterests, investmentGoals, investmentHorizon,
        income, netWorth, hashedPassword, advisorId, true, new Date(), false
      ]);
      
      const clientId = clientResult.rows[0].id;
      console.log(`Cliente creato: ${firstName} ${lastName} (ID: ${clientId})`);
      
      // Genera e inserisci asset per il cliente
      const numAssets = Math.floor(Math.random() * 5) + 2; // 2-6 asset per cliente
      for (let j = 0; j < numAssets; j++) {
        const category = getRandomItem(ASSET_CATEGORIES);
        const value = Math.floor(Math.random() * 500000) + 10000;
        const description = `${getRandomItem([
          "Investimento in", "Quota di", "Partecipazione in", "Posizione in"
        ])} ${category.replace("_", " ")}`;
        
        await client.query(`
          INSERT INTO assets (
            clientId, category, value, description, createdAt
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          clientId, category, value, description, new Date()
        ]);
      }
      
      console.log(`${numAssets} asset creati per il cliente ${clientId}`);
      
      // Genera e inserisci log per il cliente
      const numLogs = Math.floor(Math.random() * 6) + 3; // 3-8 log per cliente
      const logDates = [];
      
      // Genera date per i log (in ordine cronologico)
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      for (let j = 0; j < numLogs; j++) {
        // Genera date distanziate di circa un mese
        const logDate = new Date(sixMonthsAgo);
        logDate.setDate(logDate.getDate() + Math.floor(j * (180 / numLogs)) + Math.floor(Math.random() * 10));
        logDates.push(logDate);
      }
      
      // Ordina le date cronologicamente
      logDates.sort((a, b) => a - b);
      
      // Crea log con le date generate
      for (let j = 0; j < numLogs; j++) {
        const logType = getRandomItem(LOG_TYPES);
        const logDate = logDates[j];
        
        let title, content, emailSubject = null, emailRecipients = null;
        
        switch (logType) {
          case 'email':
            title = `Email: ${getRandomItem(emailSubjects)}`;
            content = getRandomItem(emailContents);
            emailSubject = getRandomItem(emailSubjects);
            emailRecipients = email;
            break;
          case 'note':
            title = `Nota: ${getRandomItem(["Seguimento incontro", "Considerazioni", "Aggiornamento", "Analisi situazione", "Preferenze"])}`;
            content = getRandomItem(noteContents);
            break;
          case 'call':
            title = `Chiamata: ${getRandomItem(["Aggiornamento", "Richiesta informazioni", "Consulenza", "Follow-up", "Ricontatto"])}`;
            content = getRandomItem(callContents);
            break;
          case 'meeting':
            title = `Incontro: ${getRandomItem(["Revisione portafoglio", "Pianificazione", "Consulenza", "Aggiornamento situazione", "Prima conoscenza"])}`;
            content = getRandomItem(meetingContents);
            break;
        }
        
        await client.query(`
          INSERT INTO client_logs (
            clientId, type, title, content, emailSubject, emailRecipients,
            logDate, createdAt, createdBy
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          clientId, logType, title, content, emailSubject, emailRecipients,
          logDate, new Date(), advisorId
        ]);
      }
      
      console.log(`${numLogs} log creati per il cliente ${clientId}`);
    }
    
    console.log('Generazione clienti completata con successo');
  } catch (error) {
    console.error('Errore durante la generazione dei clienti:', error);
  } finally {
    await client.end();
    console.log('Connessione al database chiusa');
  }
}

// Esegui la funzione principale
generateDemoClients().catch(console.error);