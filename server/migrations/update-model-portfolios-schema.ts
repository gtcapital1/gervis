import { sql } from 'drizzle-orm';
import { db } from '../db';

export async function up() {
  // Check if columns already exist, if not add them
  await sql`
    DO $$
    BEGIN
      -- Check if construction_logic column exists
      IF NOT EXISTS (SELECT FROM information_schema.columns 
                     WHERE table_name = 'model_portfolios' AND column_name = 'construction_logic') THEN
        ALTER TABLE model_portfolios ADD COLUMN construction_logic TEXT;
      END IF;

      -- Check if performance_fee column exists
      IF NOT EXISTS (SELECT FROM information_schema.columns 
                     WHERE table_name = 'model_portfolios' AND column_name = 'performance_fee') THEN
        ALTER TABLE model_portfolios ADD COLUMN performance_fee DECIMAL(10,5) DEFAULT 0;
      END IF;

      -- Check if total_annual_cost column exists
      IF NOT EXISTS (SELECT FROM information_schema.columns 
                     WHERE table_name = 'model_portfolios' AND column_name = 'total_annual_cost') THEN
        ALTER TABLE model_portfolios ADD COLUMN total_annual_cost DECIMAL(10,5) DEFAULT 0;
      END IF;

      -- Check if average_risk column exists
      IF NOT EXISTS (SELECT FROM information_schema.columns 
                     WHERE table_name = 'model_portfolios' AND column_name = 'average_risk') THEN
        ALTER TABLE model_portfolios ADD COLUMN average_risk DECIMAL(10,5);
      END IF;

      -- Check if average_time_horizon column exists
      IF NOT EXISTS (SELECT FROM information_schema.columns 
                     WHERE table_name = 'model_portfolios' AND column_name = 'average_time_horizon') THEN
        ALTER TABLE model_portfolios ADD COLUMN average_time_horizon DECIMAL(10,5);
      END IF;

      -- Check if asset_class_distribution column exists
      IF NOT EXISTS (SELECT FROM information_schema.columns 
                     WHERE table_name = 'model_portfolios' AND column_name = 'asset_class_distribution') THEN
        ALTER TABLE model_portfolios ADD COLUMN asset_class_distribution JSONB;
      END IF;

      -- Rename user_id to created_by if it exists and created_by doesn't exist
      IF EXISTS (SELECT FROM information_schema.columns 
                WHERE table_name = 'model_portfolios' AND column_name = 'user_id') 
         AND NOT EXISTS (SELECT FROM information_schema.columns 
                        WHERE table_name = 'model_portfolios' AND column_name = 'created_by') THEN
        ALTER TABLE model_portfolios RENAME COLUMN user_id TO created_by;
      END IF;

      -- Rename relevant column names to match the Drizzle schema
      IF EXISTS (SELECT FROM information_schema.columns 
                WHERE table_name = 'model_portfolios' AND column_name = 'entry_cost') THEN
        ALTER TABLE model_portfolios RENAME COLUMN entry_cost TO entry_cost_old;
        ALTER TABLE model_portfolios ADD COLUMN entry_cost DECIMAL(10,5) DEFAULT 0;
        UPDATE model_portfolios SET entry_cost = entry_cost_old;
      END IF;

      IF EXISTS (SELECT FROM information_schema.columns 
                WHERE table_name = 'model_portfolios' AND column_name = 'exit_cost') THEN
        ALTER TABLE model_portfolios RENAME COLUMN exit_cost TO exit_cost_old;
        ALTER TABLE model_portfolios ADD COLUMN exit_cost DECIMAL(10,5) DEFAULT 0;
        UPDATE model_portfolios SET exit_cost = exit_cost_old;
      END IF;

      IF EXISTS (SELECT FROM information_schema.columns 
                WHERE table_name = 'model_portfolios' AND column_name = 'ongoing_cost') THEN
        ALTER TABLE model_portfolios RENAME COLUMN ongoing_cost TO ongoing_cost_old;
        ALTER TABLE model_portfolios ADD COLUMN ongoing_cost DECIMAL(10,5) DEFAULT 0;
        UPDATE model_portfolios SET ongoing_cost = ongoing_cost_old;
      END IF;

      IF EXISTS (SELECT FROM information_schema.columns 
                WHERE table_name = 'model_portfolios' AND column_name = 'transaction_cost') THEN
        ALTER TABLE model_portfolios RENAME COLUMN transaction_cost TO transaction_cost_old;
        ALTER TABLE model_portfolios ADD COLUMN transaction_cost DECIMAL(10,5) DEFAULT 0;
        UPDATE model_portfolios SET transaction_cost = transaction_cost_old;
      END IF;
    END $$;
  `;

  console.log('[Migration] Portfolio table schema updated successfully');
}

export async function down() {
  // This migration cannot be easily reversed as we don't want to lose data
  console.log('[Migration] Skipping down migration for update-model-portfolios-schema');
} 