-- Script di aggiornamento della struttura del database per supportare il nuovo formato Sigmund
-- Eseguire questo script per aggiornare il campo profileData e svuotare i profili esistenti

-- Svuota i profili AI esistenti (da eseguire prima di aggiornare il server)
TRUNCATE TABLE ai_profiles CASCADE;

-- Aggiorna il commento sul campo profileData per riflettere il nuovo formato
COMMENT ON COLUMN ai_profiles.profile_data IS 'Dati del profilo in formato JSON (raccomandazioni unificate)';

-- Creazione di un indice per migliori performance nelle query
CREATE INDEX IF NOT EXISTS idx_ai_profiles_client_id ON ai_profiles (client_id);

-- Aggiorna la data di generazione per tutti i profili esistenti (se ce ne sono)
UPDATE ai_profiles SET last_generated_at = NOW();

-- Visualizza lo schema aggiornato
SELECT 
    column_name, 
    data_type, 
    col_description(table_name::regclass, ordinal_position) as column_comment
FROM 
    information_schema.columns
WHERE 
    table_name = 'ai_profiles'
ORDER BY 
    ordinal_position;