import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('connect', (client) => {
  client.query('SET statement_timeout = 30000');
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

export type QueryExecutor = {
  query: (text: string, params?: any[]) => Promise<QueryResult>;
};

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export async function withTransaction<T>(
  fn: (client: QueryExecutor) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
