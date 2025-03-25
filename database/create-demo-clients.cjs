/**
 * Script per la creazione di 10 clienti dimostrativi con dati completi e log
 * 
 * Questo script crea 10 clienti con profili completi, includendo:
 * - Dati finanziari e personali (per la tabella clients)
 * - Asset (tabella assets)
 * - Log di interazione (tabella client_logs)
 * 
 * Utilizzo:
 * - Eseguire da AWS con: node create-demo-clients.js
 * - Necessaria connessione al database PostgreSQL
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.production' });

// Configurazione database da variabili d'ambiente
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: false
};

// Costanti per la generazione dati
const PERSONAL_INTERESTS = [
  "travel", "music", "education", "technology", "literature", "health_wellness", "environment", "philanthropy", "cooking", "entrepreneurship", "arts"
];

const ASSET_CATEGORIES = ["real_estate", "equity", "bonds", "cash", "private_equity", "venture_capital", "cryptocurrencies", "other"];
const LOG_TYPES = ["email", "note", "call", "meeting"];
const EMPLOYMENT_STATUSES = ["employed", "self-employed", "unemployed", "retired"];

const FIRST_NAMES = ["Luca", "Marco", "Giulia", "Francesca", "Alessandro", "Martina", "Davide", "Sara", "Matteo", "Elena"];
const LAST_NAMES = ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco"];

// Funzione per generare un valore casuale da un array
const getRandomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Funzione per generare un array casuale di elementi da un array
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

// (Opzionale) Hash della password, se necessario in altri contesti
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Array di possibili note (usato per il campo personal_interests_notes e per i log)
const noteContents = [
  "Cliente interessato a investimenti tecnologici. Monitorare settore tech.",
  "Situazione patrimoniale in fase di consolidamento. Considerare diversificazione.",
  "Preoccupato per l'inflazione. Discutere strategie di protezione del capitale.",
  "Sta valutando l'acquisto di un immobile. Preparare simulazione mutuo.",
  "Pianificazione pensionistica prioritaria. Analizzare opzioni Pilastro 3."
];

// Contenuti per log tipo email
const emailSubjects = [
  "Riepilogo incontro di consulenza",
  "Aggiornamento portafoglio",
  "Opportunità di investimento",
  "Documentazione per nuovo prodotto finanziario",
  "Incontro trimestrale"
];

const emailContents = [
  `Gentile Cliente,
  
Come discusso, allego il riepilogo delle strategie di investimento analizzate.
Cordiali saluti`,
  `Buongiorno,
  
Ecco l'aggiornamento trimestrale del portafoglio.
Cordiali saluti`,
  `Gentile Cliente,
  
Sono emerse nuove opportunità di investimento.
Cordiali saluti`
];

const callContents = [
  "Discussa situazione attuale. Cliente soddisfatto.",
  "Aggiornamento su nuove opportunità nel settore tech.",
  "Richiesta informazioni su prodotti a basso rischio."
];

const meetingContents = [
  "Incontro di revisione portafoglio. Interesse su tecnologia.",
  "Analisi dettagliata della situazione patrimoniale.",
  "Pianificazione successoria e protezione del patrimonio."
];

// Funzione principale per generare e inserire clienti demo
async function generateDemoClients() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('Connessione al database stabilita');
    
    // Recupera l'advisor ID (prendiamo il primo utente con ruolo 'admin')
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
      // Dati per la tabella "clients"
      const firstName = getRandomItem(FIRST_NAMES);
      const lastName = getRandomItem(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
      const phone = `+393${Math.floor(Math.random() * 1000000000)}`;
      const address = `Via ${getRandomItem(["Roma", "Milano", "Napoli", "Torino", "Palermo"])}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100000)}`;
      const taxCode = generateRandomString(16);
      const password = await hashPassword('password123');
      const lastLogin = null;
      const hasPortalAccess = false;
      const isOnboarded = true;
      const isArchived = false;
      const riskProfile = getRandomItem(["conservative", "balanced", "growth", "aggressive"]);
      const investmentExperience = getRandomItem(["none", "beginner", "intermediate", "advanced"]);
      const investmentGoals = getRandomItems(["capital_preservation", "wealth_growth", "income_generation", "retirement"], 1, 3);
      const investmentHorizon = getRandomItem(["short_term", "medium_term", "long_term"]);
      const annualIncome = Math.floor(Math.random() * 150000) + 50000;
      const netWorth = Math.floor(Math.random() * 5000000) + 100000;
      const monthlyExpenses = Math.floor(Math.random() * 4000) + 1000;
      const dependents = Math.floor(Math.random() * 5);
      const employmentStatus = getRandomItem(EMPLOYMENT_STATUSES);
      const onboardingToken = generateRandomString(10);
      const tokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 giorni da ora
      const createdAt = new Date();
      const personalInterests = getRandomItems(PERSONAL_INTERESTS, 2, 5);
      const personalInterestsNotes = getRandomItem(noteContents);
      const retirementInterest = Math.floor(Math.random() * 5) + 1;
      const wealthGrowthInterest = Math.floor(Math.random() * 5) + 1;
      const incomeGenerationInterest = Math.floor(Math.random() * 5) + 1;
      const capitalPreservationInterest = Math.floor(Math.random() * 5) + 1;
      const estatePlanningInterest = Math.floor(Math.random() * 5) + 1;
      
      // Inserisce il cliente nella tabella "clients"
      const clientResult = await client.query(`
        INSERT INTO clients (
          first_name,
          last_name,
          name,
          email,
          phone,
          address,
          tax_code,
          password,
          last_login,
          has_portal_access,
          is_onboarded,
          is_archived,
          risk_profile,
          investment_experience,
          investment_goals,
          investment_horizon,
          annual_income,
          net_worth,
          monthly_expenses,
          dependents,
          employment_status,
          onboarding_token,
          token_expiry,
          created_at,
          advisor_id,
          personal_interests,
          personal_interests_notes,
          retirement_interest,
          wealth_growth_interest,
          income_generation_interest,
          capital_preservation_interest,
          estate_planning_interest
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
        RETURNING id
      `, [
        firstName,
        lastName,
        name,
        email,
        phone,
        address,
        taxCode,
        password,
        lastLogin,
        hasPortalAccess,
        isOnboarded,
        isArchived,
        riskProfile,
        investmentExperience,
        investmentGoals,
        investmentHorizon,
        annualIncome,
        netWorth,
        monthlyExpenses,
        dependents,
        employmentStatus,
        onboardingToken,
        tokenExpiry,
        createdAt,
        advisorId,
        personalInterests,
        personalInterestsNotes,
        retirementInterest,
        wealthGrowthInterest,
        incomeGenerationInterest,
        capitalPreservationInterest,
        estatePlanningInterest
      ]);
      
      const clientId = clientResult.rows[0].id;
      console.log(`Cliente creato (ID: ${clientId})`);
      
      // Genera e inserisce asset per il cliente
      const numAssets = Math.floor(Math.random() * 5) + 2; // tra 2 e 6 asset
      for (let j = 0; j < numAssets; j++) {
        const category = getRandomItem(ASSET_CATEGORIES);
        const value = Math.floor(Math.random() * 500000) + 10000;
        const description = `Investimento in ${category.replace("_", " ")}`;
        
        await client.query(`
          INSERT INTO assets (
            client_id, category, value, description, created_at
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          clientId, category, value, description, new Date()
        ]);
      }
      
      console.log(`${numAssets} asset creati per il cliente ${clientId}`);
      
      // Genera e inserisce log per il cliente
      const numLogs = Math.floor(Math.random() * 6) + 3; // tra 3 e 8 log per cliente
      const logDates = [];
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      for (let j = 0; j < numLogs; j++) {
        const logDate = new Date(sixMonthsAgo);
        logDate.setDate(logDate.getDate() + Math.floor(j * (180 / numLogs)) + Math.floor(Math.random() * 10));
        logDates.push(logDate);
      }
      
      logDates.sort((a, b) => a - b);
      
      for (let j = 0; j < numLogs; j++) {
        const logType = getRandomItem(LOG_TYPES);
        const logDate = logDates[j];
        
        let title, content, emailSubject = null, emailRecipients = null;
        
        switch (logType) {
          case 'email':
            title = `Email: ${getRandomItem(emailSubjects)}`;
            content = getRandomItem(emailContents);
            emailSubject = getRandomItem(emailSubjects);
            // Genera un'email fittizia per il log
            emailRecipients = `cliente${clientId}@example.com`;
            break;
          case 'note':
            title = `Nota: ${getRandomItem(["Follow-up", "Aggiornamento", "Analisi situazione"])}`;
            content = getRandomItem(noteContents);
            break;
          case 'call':
            title = `Chiamata: ${getRandomItem(["Aggiornamento", "Richiesta informazioni", "Consulenza"])}`;
            content = getRandomItem(callContents);
            break;
          case 'meeting':
            title = `Incontro: ${getRandomItem(["Revisione portafoglio", "Pianificazione", "Consulenza"])}`;
            content = getRandomItem(meetingContents);
            break;
        }
        
        await client.query(`
          INSERT INTO client_logs (
            client_id, type, title, content, email_subject, email_recipients,
            log_date, created_at, created_by
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