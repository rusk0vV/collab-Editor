import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString,
});

/**
 * Runs database migrations by executing the SQL statements in the init script.
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('Running database migrations...');
    const migrations = ['001-init.sql', '002-clerk-auth.sql'];
    
    await client.query('BEGIN');
    for (const filename of migrations) {
      const migrationPath = path.join(__dirname, 'migrations', filename);
      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found at: ${migrationPath}`);
      }
      console.log(`Applying migration: ${filename}`);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await client.query(sql);
    }
    await client.query('COMMIT');
    console.log('Database migrations completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to run database migrations:', error);
    throw error;
  } finally {
    client.release();
  }
}
