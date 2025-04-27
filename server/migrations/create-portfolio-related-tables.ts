import { sql } from '../db';

export async function up() {
  // Controlla se le tabelle esistono già
  const tablesExist = await sql`
    SELECT EXISTS (SELECT FROM information_schema.tables 
                  WHERE table_name = 'model_portfolios')
    AND EXISTS (SELECT FROM information_schema.tables 
                  WHERE table_name = 'model_portfolio_allocations')
    AND EXISTS (SELECT FROM information_schema.tables 
                  WHERE table_name = 'model_portfolio_instruments');
  `;

  // Se le tabelle non esistono ancora, creale
  if (!tablesExist.rows[0].exists) {
    // Creazione della tabella dei portafogli modello
    await sql`
      CREATE TABLE IF NOT EXISTS model_portfolios (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        construction_logic TEXT,
        entry_cost DECIMAL(10,5) DEFAULT 0,
        exit_cost DECIMAL(10,5) DEFAULT 0,
        ongoing_cost DECIMAL(10,5) DEFAULT 0,
        transaction_cost DECIMAL(10,5) DEFAULT 0,
        target_return DECIMAL(10,5),
        risk_level INTEGER DEFAULT 3,
        recommended_period INTEGER DEFAULT 5,
        client_profile VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    // Creazione della tabella per le allocazioni degli asset
    await sql`
      CREATE TABLE IF NOT EXISTS model_portfolio_allocations (
        id SERIAL PRIMARY KEY,
        portfolio_id INTEGER NOT NULL,
        category VARCHAR(255) NOT NULL,
        percentage DECIMAL(10,2) NOT NULL,
        risk_level INTEGER DEFAULT 3,
        recommended_period INTEGER DEFAULT 5,
        expected_return DECIMAL(10,5),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_portfolio FOREIGN KEY (portfolio_id) REFERENCES model_portfolios(id) ON DELETE CASCADE
      );
    `;

    // Creazione della tabella per gli strumenti inclusi nelle allocazioni
    await sql`
      CREATE TABLE IF NOT EXISTS model_portfolio_instruments (
        id SERIAL PRIMARY KEY,
        allocation_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        isin VARCHAR(255),
        percentage DECIMAL(10,2) NOT NULL,
        entry_cost DECIMAL(10,5) DEFAULT 0,
        exit_cost DECIMAL(10,5) DEFAULT 0,
        ongoing_cost DECIMAL(10,5) DEFAULT 0,
        transaction_cost DECIMAL(10,5) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_allocation FOREIGN KEY (allocation_id) REFERENCES model_portfolio_allocations(id) ON DELETE CASCADE
      );
    `;

    // Verifica che la tabella user_products esista
    const userProductsExist = await sql`
      SELECT EXISTS (SELECT FROM information_schema.tables 
                    WHERE table_name = 'user_products');
    `;

    // Se la tabella user_products non esiste, creala
    if (!userProductsExist.rows[0].exists) {
      await sql`
        CREATE TABLE IF NOT EXISTS user_products (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          is_favorite BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_product_id FOREIGN KEY (product_id) REFERENCES portfolio_products(id) ON DELETE CASCADE
        );
      `;
    }
  }
}

export async function down() {
  // Drop delle tabelle in ordine inverso per rispettare i vincoli di chiave esterna
  await sql`DROP TABLE IF EXISTS model_portfolio_instruments;`;
  await sql`DROP TABLE IF EXISTS model_portfolio_allocations;`;
  await sql`DROP TABLE IF EXISTS model_portfolios;`;
} 