import { pool } from '../client';

export interface UserRecord {
  clerk_id: string;
  created_at: Date;
}

/**
 * Upserts a user by their Clerk ID.
 */
export async function upsertUser(clerkId: string): Promise<UserRecord> {
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (clerk_id)
     VALUES ($1)
     ON CONFLICT (clerk_id) DO NOTHING
     RETURNING clerk_id, created_at`,
    [clerkId]
  );
  return result.rows[0];
}
