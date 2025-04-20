-- Controlla se la colonna metadata esiste già
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'metadata'
    ) THEN
        -- Aggiungi la colonna metadata se non esiste
        ALTER TABLE conversations ADD COLUMN metadata TEXT;
        
        RAISE NOTICE 'Colonna metadata aggiunta alla tabella conversations';
    ELSE
        RAISE NOTICE 'La colonna metadata esiste già nella tabella conversations';
    END IF;
END $$; 