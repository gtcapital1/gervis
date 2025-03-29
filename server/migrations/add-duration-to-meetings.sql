-- Migrazione per aggiungere la colonna duration alla tabella meetings
ALTER TABLE meetings ADD COLUMN duration INTEGER DEFAULT 60;

-- Aggiungere un commento alla colonna
COMMENT ON COLUMN meetings.duration IS 'Durata del meeting in minuti, default 60 minuti'; 