-- Script per la creazione del database e dell'utente
CREATE DATABASE gervis;

-- Crea un utente dedicato per l'applicazione
-- Sostituisci 'password_sicura' con una password forte
CREATE USER gervis_user WITH PASSWORD 'password_sicura';

-- Concedi i permessi necessari
GRANT ALL PRIVILEGES ON DATABASE gervis TO gervis_user;

-- Connettiti al database appena creato
\c gervis

-- Abilita l'estensione pgcrypto per funzionalità crittografiche
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Le tabelle verranno create automaticamente dall'applicazione tramite Drizzle ORM
-- quando l'applicazione viene avviata per la prima volta