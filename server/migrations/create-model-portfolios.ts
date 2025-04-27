import { db } from '../db';

export async function up() {
  // Creare la tabella dei portafogli modello
  await db.schema.createTable('model_portfolios', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users');
    table.string('name').notNullable();
    table.text('description').nullable();
    table.text('construction_logic').nullable();
    table.decimal('entry_cost', 10, 5).defaultTo(0); // costi ingresso
    table.decimal('exit_cost', 10, 5).defaultTo(0); // costi uscita
    table.decimal('ongoing_cost', 10, 5).defaultTo(0); // costi ongoing
    table.decimal('transaction_cost', 10, 5).defaultTo(0); // costi transazione
    table.decimal('target_return', 10, 5).nullable(); // rendimento atteso
    table.integer('risk_level').defaultTo(3); // livello di rischio 1-5
    table.integer('recommended_period').defaultTo(5); // periodo consigliato in anni
    table.string('client_profile').nullable(); // profilo cliente target
    table.timestamps(true, true);
  });

  // Creare la tabella per le allocazioni degli asset
  await db.schema.createTable('model_portfolio_allocations', (table) => {
    table.increments('id').primary();
    table.integer('portfolio_id').notNullable().references('id').inTable('model_portfolios').onDelete('CASCADE');
    table.string('category').notNullable(); // Categoria di asset (es. Azioni, Obbligazioni)
    table.decimal('percentage', 10, 2).notNullable(); // Percentuale allocata (0-100)
    table.integer('risk_level').defaultTo(3); // Livello di rischio della categoria 1-5
    table.integer('recommended_period').defaultTo(5); // Periodo raccomandato per questa categoria
    table.decimal('expected_return', 10, 5).nullable(); // Rendimento atteso della categoria
    table.timestamps(true, true);
  });

  // Creare la tabella per gli strumenti inclusi nelle allocazioni
  await db.schema.createTable('model_portfolio_instruments', (table) => {
    table.increments('id').primary();
    table.integer('allocation_id').notNullable().references('id').inTable('model_portfolio_allocations').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('isin').nullable();
    table.decimal('percentage', 10, 2).notNullable(); // Percentuale all'interno della categoria
    table.decimal('entry_cost', 10, 5).defaultTo(0);
    table.decimal('exit_cost', 10, 5).defaultTo(0);
    table.decimal('ongoing_cost', 10, 5).defaultTo(0);
    table.decimal('transaction_cost', 10, 5).defaultTo(0);
    table.timestamps(true, true);
  });
}

export async function down() {
  await db.schema.dropTableIfExists('model_portfolio_instruments');
  await db.schema.dropTableIfExists('model_portfolio_allocations');
  await db.schema.dropTableIfExists('model_portfolios');
} 