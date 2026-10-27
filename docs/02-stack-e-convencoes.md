# Stack e convenções

## Tecnologias e responsabilidades

### Frontend — React + Vite + TypeScript
- Telas de login e chat; estado da UI; comunicação com a API.
- Exibe respostas, erros e mensagens de acesso negado.
- Validação de dados de interface quando aplicável.
- **Não é fronteira de segurança.**

### Backend — NestJS + TypeScript
- Endpoints; autenticação e sessões; regras de autorização.
- Orquestra chat e integração com IA; valida e executa ferramentas.
- Auditoria; comunicação com o banco.

### Banco — PostgreSQL + Drizzle ORM
- PostgreSQL persiste; Drizzle define esquema tipado, consultas tipadas e **migrações versionadas**.
- Usar as 9 tabelas aprovadas e o contrato de [decisoes-fechadas](decisoes-fechadas.md) §1 como base; o agente cria o schema Drizzle.

### Validação — Zod
- Argumentos de ferramentas e dados que exijam validação de esquema.
- Não substitui autorização.

### Testes — Vitest
- Frontend e backend: unitários, serviços/regras de negócio, componentes de UI, integração, casos positivos/negativos/limite de autorização.
- **Sem Jest. Sem Playwright.**
- NestJS usa Jest por padrão: **configurar o Vitest explicitamente** no backend.

### IA — Gemini API (Google)
- Encapsulada em `features/ai/` por adaptador próprio.
- **LangChain.js** faz parte da stack: camada de integração e orquestração entre `features/ai/` e a Gemini API, restrito a esse módulo. Ver [ia-gemini-langchain](funcionalidades/ia-gemini-langchain.md).

### Senhas — Argon2id

## Estrutura de repositório (do documento)

```
frontend/   # React
backend/    # NestJS
docs/       # documentação técnica
(+ arquivos de ambiente e Docker Compose, quando usado)
```

## Estrutura de pastas **[Sugestão]**

```
backend/src/
  features/
    auth/
    users/
    authorization/
    chat/
    ai/
      ai-provider.interface.ts     # contrato interno (independente de fornecedor)
      gemini.adapter.ts            # implementação Gemini (usa LangChain.js)
    tools/
      tool.interface.ts            # contrato de ferramenta
      tool-registry.ts
      tool-executor.ts
      definitions/                 # uma pasta/arquivo por ferramenta
    audit/
  infrastructure/
    database/                      # conexão, schema Drizzle, migrações
  shared/                          # erros, tipos, logging, trace_id
frontend/src/
  pages/ (login, chat) · components/ · api/ · state/
```

## Convenções **[Sugestão]**

- TypeScript estrito; sem `any` em fronteiras de módulo.
- Um contrato (interface/tipo) por fronteira entre módulos; módulos dependem do contrato, não da implementação.
- Erros padronizados com **código estável** + mensagem segura (ver [api-endpoints](api-endpoints.md)).
- Nomes de arquivos de teste ao lado do código (`*.spec.ts` / `*.test.ts`) executados pelo Vitest.
- Mensagens ao usuário em pt-BR.
