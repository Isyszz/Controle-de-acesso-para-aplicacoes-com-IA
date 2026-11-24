import { describe, it, expect } from 'vitest';
import { validateDatabaseUrlTest } from './test-db-guard.js';
import { env } from 'node:process';

const ORIGINAL_DATABASE_URL_TEST = env.DATABASE_URL_TEST;

afterEach(() => {
  if (ORIGINAL_DATABASE_URL_TEST === undefined) {
    delete env.DATABASE_URL_TEST;
  } else {
    env.DATABASE_URL_TEST = ORIGINAL_DATABASE_URL_TEST;
  }
});

describe('validateDatabaseUrlTest', () => {
  it('deve lançar erro quando DATABASE_URL_TEST não está definida', () => {
    delete env.DATABASE_URL_TEST;

    expect(() => validateDatabaseUrlTest()).toThrow(
      'DATABASE_URL_TEST não definida',
    );
  });

  it('deve lançar erro quando DATABASE_URL_TEST é uma URL inválida', () => {
    env.DATABASE_URL_TEST = 'não-é-uma-url';

    expect(() => validateDatabaseUrlTest()).toThrow('formato inválido');
  });

  it('deve lançar erro quando host não é localhost nem 127.0.0.1', () => {
    env.DATABASE_URL_TEST =
      'postgresql://dbprototipo_user:password@db.example.com:5432/dbprototipo_test';

    expect(() => validateDatabaseUrlTest()).toThrow('host não permitido');
  });

  it('deve lançar erro quando porta não é 5432', () => {
    env.DATABASE_URL_TEST =
      'postgresql://dbprototipo_user:password@localhost:5433/dbprototipo_test';

    expect(() => validateDatabaseUrlTest()).toThrow('porta não esperada');
  });

  it('deve lançar erro quando banco não é dbprototipo_test', () => {
    env.DATABASE_URL_TEST =
      'postgresql://dbprototipo_user:password@localhost:5432/dbprototipo';

    expect(() => validateDatabaseUrlTest()).toThrow('banco inesperado');
  });

  it('deve aceitar URL válida com localhost', () => {
    env.DATABASE_URL_TEST =
      'postgresql://dbprototipo_user:password@localhost:5432/dbprototipo_test';

    expect(() => validateDatabaseUrlTest()).not.toThrow();
  });

  it('deve aceitar URL válida com 127.0.0.1', () => {
    env.DATABASE_URL_TEST =
      'postgresql://dbprototipo_user:password@127.0.0.1:5432/dbprototipo_test';

    expect(() => validateDatabaseUrlTest()).not.toThrow();
  });
});

describe('getDb() com DATABASE_URL_TEST', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = env.DATABASE_URL_TEST;
  });

  afterEach(() => {
    vi.resetModules();
    if (originalEnv === undefined) {
      delete env.DATABASE_URL_TEST;
    } else {
      env.DATABASE_URL_TEST = originalEnv;
    }
  });

  it('deve lançar erro quando DATABASE_URL_TEST não está definida', async () => {
    delete env.DATABASE_URL_TEST;

    const { getDb } = await import('../../../infrastructure/database/index.js');

    expect(() => getDb()).toThrow('DATABASE_URL_TEST não definida');
  });

  it('deve lançar erro quando DATABASE_URL_TEST é uma URL inválida', async () => {
    env.DATABASE_URL_TEST = 'não-é-uma-url';

    const { getDb } = await import('../../../infrastructure/database/index.js');

    expect(() => getDb()).toThrow('formato inválido');
  });

  it('deve lançar erro quando getDb recebe URL personalizada diferente de DATABASE_URL_TEST', async () => {
    env.DATABASE_URL_TEST =
      'postgresql://dbprototipo_user:password@localhost:5432/dbprototipo_test';

    const { getDb } = await import('../../../infrastructure/database/index.js');

    expect(() =>
      getDb('postgresql://outro_usuario:senha@outrohost:5432/outro_banco'),
    ).toThrow('URL personalizada não é permitido');
  });

  it('deve lançar erro quando getDb recebe URL com host não permitido', async () => {
    env.DATABASE_URL_TEST =
      'postgresql://dbprototipo_user:password@db.example.com:5432/dbprototipo_test';

    const { getDb } = await import('../../../infrastructure/database/index.js');

    expect(() => getDb(env.DATABASE_URL_TEST)).toThrow('host não permitido');
  });

  it('deve lançar erro quando getDb recebe URL com porta diferente de 5432', async () => {
    env.DATABASE_URL_TEST =
      'postgresql://dbprototipo_user:password@localhost:5433/dbprototipo_test';

    const { getDb } = await import('../../../infrastructure/database/index.js');

    expect(() => getDb(env.DATABASE_URL_TEST)).toThrow('porta não esperada');
  });

  it('deve lançar erro quando getDb recebe URL com banco diferente de dbprototipo_test', async () => {
    env.DATABASE_URL_TEST =
      'postgresql://dbprototipo_user:password@localhost:5432/dbprototipo';

    const { getDb } = await import('../../../infrastructure/database/index.js');

    expect(() => getDb(env.DATABASE_URL_TEST)).toThrow('banco inesperado');
  });

  it('não deve lançar erro quando getDb recebe DATABASE_URL_TEST válida', async () => {
    env.DATABASE_URL_TEST =
      'postgresql://dbprototipo_user:password@localhost:5432/dbprototipo_test';

    const { getDb } = await import('../../../infrastructure/database/index.js');

    expect(() => getDb()).not.toThrow();
  });
});
