import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import { validateDatabaseUrlTest } from '../../features/auth/test-helpers/test-db-guard.js';

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb(databaseUrl?: string) {
  if (_db) {
    return _db;
  }

  const url =
    databaseUrl ??
    (process.env.NODE_ENV === 'test'
      ? process.env.DATABASE_URL_TEST
      : process.env.DATABASE_URL);

  if (!url) {
    throw new Error(
      'DATABASE_URL ou DATABASE_URL_TEST não definida. Configure o arquivo .env (ex.: .env.example).',
    );
  }

  if (process.env.NODE_ENV === 'test') {
    if (!process.env.DATABASE_URL_TEST) {
      throw new Error(
        'DATABASE_URL_TEST não definida. Testes de integração requerem DATABASE_URL_TEST. Nunca usar DATABASE_URL como fallback.',
      );
    }

    if (databaseUrl && databaseUrl !== process.env.DATABASE_URL_TEST) {
      throw new Error(
        'getDb() com URL personalizada não é permitido em ambiente de teste. Use apenas DATABASE_URL_TEST.',
      );
    }

    validateDatabaseUrlTest();
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
