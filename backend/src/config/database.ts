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

// --- Transient error retry logic ---

const RETRY_COUNT = 2;
const RETRY_BASE_MS = 200;

export function isTransientError(err: any): boolean {
  const code = err?.code;
  if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
    return true;
  }
  // PostgreSQL admin shutdown (common during Railway Postgres restarts)
  if (code === '57P01') {
    return true;
  }
  const msg = err?.message || '';
  if (msg.includes('Connection terminated') || msg.includes('connection terminated')) {
    return true;
  }
  // AggregateError from newer Node (multiple connection attempts)
  if (err?.errors?.some((e: any) =>
    ['ECONNREFUSED', 'ETIMEDOUT'].includes(e.code)
  )) {
    return true;
  }
  return false;
}

async function retryable<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt < RETRY_COUNT && isTransientError(err)) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        console.warn(
          `Transient DB error (attempt ${attempt + 1}/${RETRY_COUNT + 1}), retrying in ${delay}ms:`,
          (err as any)?.code || (err as any)?.message
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Retry loop exited unexpectedly');
}

// --- Exported query functions ---

export const query = (text: string, params?: any[]) => {
  return retryable(() => pool.query(text, params));
};

export async function withTransaction<T>(
  fn: (client: QueryExecutor) => Promise<T>
): Promise<T> {
  return retryable(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  });
}

export default pool;
