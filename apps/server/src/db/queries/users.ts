import { pool } from '../client';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
}

/**
 * Finds a user by their email address.
 */
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    'SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

/**
 * Finds a user by their UUID.
 */
export async function findUserById(id: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    'SELECT id, email, name, password_hash, created_at FROM users WHERE id = $1',
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

/**
 * Inserts a new user record.
 */
export async function createUser(email: string, name: string, passwordHash: string): Promise<UserRecord> {
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (email, name, password_hash) 
     VALUES ($1, $2, $3) 
     RETURNING id, email, name, password_hash, created_at`,
    [email.toLowerCase().trim(), name.trim(), passwordHash]
  );
  
  return result.rows[0];
}
