import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb(databaseUrl?: string) {
  if (_db) {
    return _db;
  }

  const url =
    databaseUrl ??
    (process.env.NODE_ENV === 'test'
      ? process.env.DATABASE_URL_TEST
      : undefined) ??
    process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL não definida. Configure o arquivo .env (ex.: .env.example).',
    );
  }

  const pool = new Pool({
    connectionString: url,
  });

  _db = drizzle(pool, { schema });

  return _db;
}

export function resetDb() {
  _db = null;
}

export { schema };

export type Db = ReturnType<typeof getDb>;
