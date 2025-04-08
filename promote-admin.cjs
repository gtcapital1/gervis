const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: false
};

async function createAndPromoteAdmin() {
  const email = 'gianmarco.trapasso@gmail.com';
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('Connessione al database stabilita');

    // Aggiungi le colonne mancanti alla tabella users
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name') THEN
          ALTER TABLE users ADD COLUMN name VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='first_name') THEN
          ALTER TABLE users ADD COLUMN first_name VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_name') THEN
          ALTER TABLE users ADD COLUMN last_name VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
          ALTER TABLE users ADD COLUMN password_hash VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
          ALTER TABLE users ADD COLUMN role VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='approval_status') THEN
          ALTER TABLE users ADD COLUMN approval_status VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_email_verified') THEN
          ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='registration_completed') THEN
          ALTER TABLE users ADD COLUMN registration_completed BOOLEAN;
        END IF;
      END
      $$;
    `);

    // Prima controlla se l'utente esiste già
    const checkUser = await client.query(
      'SELECT id, first_name FROM users WHERE email = $1',
      [email]
    );

    let userId;

    if (checkUser.rows.length === 0) {
      // Estrai username dall'email (parte prima della @)
      const username = email.split('@')[0];
      
      // Crea nuovo utente
      const insertResult = await client.query(
        `INSERT INTO users (
          username, email, first_name, last_name, password, role, 
          approval_status, is_email_verified, registration_completed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          username,
          email,
          'Gianmarco',
          'Trapasso',
          'password_hash', // Dovresti usare un hash reale in produzione
          'admin',
          'approved',
          true,
          true
        ]
      );
      userId = insertResult.rows[0].id;
      console.log(`Nuovo utente creato con ID: ${userId}`);
    } else {
      userId = checkUser.rows[0].id;
      console.log(`Utente esistente trovato con ID: ${userId}`);
    }

    // Aggiorna il ruolo a admin
    const updateResult = await client.query(
      'UPDATE users SET role = $1, approval_status = $2 WHERE id = $3 RETURNING *',
      ['admin', 'approved', userId]
    );

    if (updateResult.rows.length > 0) {
      console.log(`Utente ${updateResult.rows[0].first_name} (${email}) è stato promosso ad admin`);
      console.log(`Ruolo: ${updateResult.rows[0].role}, Stato: ${updateResult.rows[0].approval_status}`);
    }
  } catch (error) {
    console.error('Errore durante la creazione/promozione dell\'utente:', error);
  } finally {
    await client.end();
    console.log('Connessione al database chiusa');
  }
}

createAndPromoteAdmin()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });