#!/bin/bash

# Script per aggiungere colonne di interessi personali al database su AWS
# Da eseguire come utente ubuntu sulla macchina AWS

set -e  # Termina lo script in caso di errori

echo "Aggiunta dei campi di interessi personali al database..."

# Connessione al database PostgreSQL
psql -c "
-- Aggiunta campo per interessi personali
ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS personal_interests TEXT[];

-- Aggiunta campo per note aggiuntive sugli interessi
ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS personal_interests_notes TEXT;

-- Aggiunta campi per rating degli obiettivi di investimento (1-5)
ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS retirement_interest INTEGER;

ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS wealth_growth_interest INTEGER;

ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS income_generation_interest INTEGER;

ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS capital_preservation_interest INTEGER;

ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS estate_planning_interest INTEGER;
" "postgres://gervis:Oliver1@localhost:5432/gervis"

echo "Migrazione completata con successo!"