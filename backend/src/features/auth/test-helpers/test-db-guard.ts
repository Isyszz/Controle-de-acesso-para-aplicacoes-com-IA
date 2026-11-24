export function validateDatabaseUrlTest(): void {
  const databaseUrlTest = process.env.DATABASE_URL_TEST;

  if (!databaseUrlTest) {
    throw new Error(
      'DATABASE_URL_TEST não definida. Configure o arquivo .env antes de executar testes de integração.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrlTest);
  } catch {
    throw new Error(
      'DATABASE_URL_TEST tem formato inválido. Não é possível extrair o destino da conexão.',
    );
  }

  const hostname = parsed.hostname;
  const port = parsed.port;
  const pathname = parsed.pathname;

  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    throw new Error(
      'DATABASE_URL_TEST aponta para host não permitido. Apenas localhost/127.0.0.1 é aceito.',
    );
  }

  if (port !== '5432') {
    throw new Error(
      'DATABASE_URL_TEST usa porta não esperada. Apenas 5432 é aceito.',
    );
  }

  const databaseName = pathname.replace(/^\//, '');
  if (databaseName !== 'dbprototipo_test') {
    throw new Error(
      'DATABASE_URL_TEST aponta para banco inesperado. Apenas dbprototipo_test é permitido.',
    );
  }
}
