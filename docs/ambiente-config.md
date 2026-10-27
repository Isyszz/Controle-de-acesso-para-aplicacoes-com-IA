# Ambiente e configuração

Requisitos: RNF-12, RNF-15.

## Repositório
`frontend/` (React) · `backend/` (NestJS) · `docs/` · arquivos de ambiente · Docker Compose (opcional).

## Variáveis de ambiente
Segredos e configs **fora do código**. Categorias previstas:
- Conexão PostgreSQL.
- **Chave da Gemini API** (somente backend).
- Configurações do servidor.
- Origem permitida do frontend (CORS).
- Configurações de sessão.
- Específicas de desenvolvimento e testes (ex.: banco de teste separado).

Nomes definitivos: definir na implementação e **documentar em `.env.example`** (sem valores secretos reais). Arquivos `.env` com segredos **não** são versionados (`.gitignore`).

### Exemplo **[Sugestão]**
```dotenv
# .env.example  (sem segredos reais)
DATABASE_URL=postgresql://user:password@localhost:5432/projeto_c
DATABASE_URL_TEST=postgresql://user:password@localhost:5433/projeto_c_test
GEMINI_API_KEY=
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
SESSION_TTL_MINUTES=
SESSION_COOKIE_NAME=
CSRF_SECRET=
GEMINI_MODEL=
AUDIT_RETENTION_DAYS=365
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15
AI_MAX_ITERATIONS=5
AI_MAX_TOOL_CALLS=4
```

## Banco e migrações
Estrutura criada/atualizada **apenas** por migrações do Drizzle; versionadas e revisadas; sem alteração manual não documentada no esquema compartilhado.

## Docker Compose (opcional)
Pode subir serviços locais (ex.: PostgreSQL dev e de teste) para ambiente reprodutível.

## Testes
Vitest configurado por app; backend considera ambiente NestJS, resolução de módulos, async e setup/teardown de dados.

## Documentação a entregar (Etapa 9)
Instruções de instalação e execução · endpoints e contratos · configuração do ambiente · resultados dos testes · cenários de demonstração (permitido, negado, rastreável).
