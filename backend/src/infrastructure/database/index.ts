import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

/**
 * Módulo de persistência — Stage B.
 *
 * Fornece uma única instância do cliente Drizzle (singleton) compartilhada
 * por todos os módulos do backend, evitando conexões independentes e
 * não controladas com o PostgreSQL.
 *
 * A URL de conexão vem de DATABASE_URL (ou DATABASE_URL_TEST quando
 * NODE_ENV=test), lida via dotenv no ponto de entrada da aplicação.
 */

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
