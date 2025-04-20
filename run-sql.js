import dotenv from 'dotenv';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL non è definito nel file .env');
  process.exit(1);
}

const sqlFilePath = join(__dirname, 'fix-conversations-table.sql');

console.log('Esecuzione dello script SQL per aggiungere la colonna metadata...');
exec(`psql "${dbUrl}" -f ${sqlFilePath}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Errore: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  console.log(`stdout: ${stdout}`);
  console.log('Script SQL eseguito con successo!');
}); 