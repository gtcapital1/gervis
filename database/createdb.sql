-- setup_gervis_complete.sql
-- ========================================================
-- Script per creare lo schema completo del database "gervis"
-- con tutte le tabelle e colonne riportate:
--
-- Tabella ai_profiles:
--   id                SERIAL PRIMARY KEY
--   client_id         INTEGER
--   profile_data      JSONB
--   last_generated_at TIMESTAMP WITHOUT TIME ZONE
--   created_by        INTEGER
--
-- Tabella assets:
--   id          SERIAL PRIMARY KEY
--   client_id   INTEGER
--   category    TEXT
--   value       INTEGER
--   description TEXT
--   created_at  TIMESTAMP WITHOUT TIME ZONE
--
-- Tabella client_logs:
--   id              SERIAL PRIMARY KEY
--   client_id       INTEGER
--   type            TEXT
--   title           TEXT
--   content         TEXT
--   email_subject   TEXT
--   email_recipients TEXT
--   log_date        TIMESTAMP WITHOUT TIME ZONE
--   created_at      TIMESTAMP WITHOUT TIME ZONE
--   created_by      INTEGER
--
-- Tabella clients:
--   id                          SERIAL PRIMARY KEY
--   first_name                  TEXT
--   last_name                   TEXT
--   name                        TEXT
--   email                       TEXT
--   phone                       TEXT
--   address                     TEXT
--   tax_code                    TEXT
--   password                    TEXT
--   last_login                  TIMESTAMP WITHOUT TIME ZONE
--   has_portal_access           BOOLEAN
--   is_onboarded                BOOLEAN
--   is_archived                 BOOLEAN
--   risk_profile                TEXT
--   investment_experience       TEXT
--   investment_goals            TEXT[]      -- Array di testo
--   investment_horizon          TEXT
--   annual_income               INTEGER
--   net_worth                   INTEGER
--   monthly_expenses            INTEGER
--   dependents                  INTEGER
--   employment_status           TEXT
--   onboarding_token            TEXT
--   token_expiry                TIMESTAMP WITHOUT TIME ZONE
--   created_at                  TIMESTAMP WITHOUT TIME ZONE
--   advisor_id                  INTEGER
--   personal_interests          TEXT[]      -- Array di testo
--   personal_interests_notes    TEXT
--   retirement_interest         INTEGER
--   wealth_growth_interest      INTEGER
--   income_generation_interest  INTEGER
--   capital_preservation_interest INTEGER
--   estate_planning_interest    INTEGER
--
-- Tabella recommendations:
--   id          SERIAL PRIMARY KEY
--   client_id   INTEGER
--   content     TEXT
--   created_at  TIMESTAMP WITHOUT TIME ZONE
--   actions     JSONB
--
-- Tabella session:
--   sid     VARCHAR PRIMARY KEY
--   sess    JSON
--   expire  TIMESTAMP WITHOUT TIME ZONE
--
-- Tabella spark_priorities:
--   id                  SERIAL PRIMARY KEY
--   client_id           INTEGER
--   title               TEXT
--   description         TEXT
--   priority            INTEGER
--   related_news_title  TEXT
--   related_news_url    TEXT
--   is_new              BOOLEAN
--   created_at          TIMESTAMP WITHOUT TIME ZONE
--   last_updated_at     TIMESTAMP WITHOUT TIME ZONE
--   created_by          INTEGER
--
-- Tabella users:
--   id                           SERIAL PRIMARY KEY
--   username                     TEXT
--   first_name                   TEXT
--   last_name                    TEXT
--   company                      TEXT
--   is_independent               BOOLEAN
--   password                     TEXT
--   email                        TEXT
--   name                         TEXT
--   phone                        TEXT
--   signature                    TEXT
--   company_logo                 TEXT
--   company_info                 TEXT
--   role                         TEXT
--   is_pro                       BOOLEAN
--   pro_since                    TIMESTAMP WITHOUT TIME ZONE
--   is_email_verified            BOOLEAN
--   verification_token           TEXT
--   verification_token_expires   TIMESTAMP WITHOUT TIME ZONE
--   verification_pin             TEXT
--   registration_completed       BOOLEAN
--   approval_status              TEXT
--   created_at                   TIMESTAMP WITHOUT TIME ZONE
-- ========================================================

-- Rimuovo le tabelle esistenti, nell'ordine corretto per evitare conflitti di dipendenze
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS spark_priorities CASCADE;
DROP TABLE IF EXISTS client_logs CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS ai_profiles CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Creazione tabella ai_profiles
CREATE TABLE ai_profiles (
    id SERIAL PRIMARY KEY,
    client_id INTEGER,
    profile_data JSONB,
    last_generated_at TIMESTAMP WITHOUT TIME ZONE,
    created_by INTEGER
);

-- Creazione tabella assets
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    client_id INTEGER,
    category TEXT,
    value INTEGER,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE
);

-- Creazione tabella client_logs
CREATE TABLE client_logs (
    id SERIAL PRIMARY KEY,
    client_id INTEGER,
    type TEXT,
    title TEXT,
    content TEXT,
    email_subject TEXT,
    email_recipients TEXT,
    log_date TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    created_by INTEGER
);

-- Creazione tabella clients
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_code TEXT,
    password TEXT,
    last_login TIMESTAMP WITHOUT TIME ZONE,
    has_portal_access BOOLEAN,
    is_onboarded BOOLEAN,
    is_archived BOOLEAN,
    risk_profile TEXT,
    investment_experience TEXT,
    investment_goals TEXT[],
    investment_horizon TEXT,
    annual_income INTEGER,
    net_worth INTEGER,
    monthly_expenses INTEGER,
    dependents INTEGER,
    employment_status TEXT,
    onboarding_token TEXT,
    token_expiry TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    advisor_id INTEGER,
    personal_interests TEXT[],
    personal_interests_notes TEXT,
    retirement_interest INTEGER,
    wealth_growth_interest INTEGER,
    income_generation_interest INTEGER,
    capital_preservation_interest INTEGER,
    estate_planning_interest INTEGER
);

-- Creazione tabella recommendations
CREATE TABLE recommendations (
    id SERIAL PRIMARY KEY,
    client_id INTEGER,
    content TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    actions JSONB
);

-- Creazione tabella session
CREATE TABLE session (
    sid VARCHAR PRIMARY KEY,
    sess JSON,
    expire TIMESTAMP WITHOUT TIME ZONE
);

-- Creazione tabella spark_priorities
CREATE TABLE spark_priorities (
    id SERIAL PRIMARY KEY,
    client_id INTEGER,
    title TEXT,
    description TEXT,
    priority INTEGER,
    related_news_title TEXT,
    related_news_url TEXT,
    is_new BOOLEAN,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    last_updated_at TIMESTAMP WITHOUT TIME ZONE,
    created_by INTEGER
);

-- Creazione tabella users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    company TEXT,
    is_independent BOOLEAN,
    password TEXT,
    email TEXT,
    name TEXT,
    phone TEXT,
    signature TEXT,
    company_logo TEXT,
    company_info TEXT,
    role TEXT,
    is_pro BOOLEAN,
    pro_since TIMESTAMP WITHOUT TIME ZONE,
    is_email_verified BOOLEAN,
    verification_token TEXT,
    verification_token_expires TIMESTAMP WITHOUT TIME ZONE,
    verification_pin TEXT,
    registration_completed BOOLEAN,
    approval_status TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE
);
