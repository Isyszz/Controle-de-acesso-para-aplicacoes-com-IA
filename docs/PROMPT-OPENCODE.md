# PROMPT PARA O OPENCODE (versão enxuta)

> Cole como primeira mensagem, no modo **Plan**, na raiz do repositório. O detalhe de branches, protocolo e critérios de aceite está em `docs/plano-implementacao.md`, não aqui.

---

Você é o agente responsável por **toda a implementação** do Projeto C (protótipo de assistente de IA com ferramentas protegidas). Princípio: **a IA propõe, o backend decide.** Meta: fluxo ponta a ponta funcional (login → chat → IA propõe ferramenta → backend autoriza ou nega → auditoria), com testes Vitest provando permitido e bloqueado. Textos de UI, erros e docs em pt-BR; código em inglês.

## 1. Leia primeiro (apenas estes 4)
1. `AGENTS.md` (leitura em camadas e skills)
2. `docs/00-regras-inegociaveis.md`
3. `docs/decisoes-fechadas.md`
4. `docs/plano-implementacao.md` (seção "Branches de implementação")

Os demais docs, você lê só quando a branch exigir. Se `AGENTS.md`, `docs/decisoes-fechadas.md` ou `.opencode/skills/` não existirem, pare e avise.

## 2. Estado atual (já feito por mim; não refaça)
Backend NestJS + TypeScript; PostgreSQL local no Windows (banco `dbprototipo`, usuário `dbprototipo_user`); `backend/.env` com `DATABASE_URL` testada; Drizzle ORM/Kit configurados (`drizzle.config.ts` → `src/db/schema.ts`, pasta `drizzle`); dependências: `@nestjs/*`, `drizzle-orm`, `drizzle-kit`, `pg`, `dotenv`, `argon2`, `zod`, `@langchain/core`, `@langchain/google`, `vitest`, `oxlint`. Build, lint e teste do Nest passaram. **Faltam:** schema, migrações, funcionalidades, Gemini funcional, testes. As configurações de **banco** e de **Gemini** estão em **branches diferentes**.

## 3. Estrutura-alvo
`frontend/` (React+Vite) e `backend/src/` com `features/{auth,users,sessions,authorization,chat,ai,tools,audit}`, `infrastructure/database/{schema.ts,index.ts}`, `shared/{errors,logging,trace,types}`, `backend/drizzle/`, `backend/test/`, `docs/`. Se a árvore real divergir, o `drizzle.config.ts` deve passar a apontar para `src/infrastructure/database/schema.ts`. Onde meu contexto antigo cita "políticas de autorização" como tabela, ignore: políticas ficam no código; o banco tem só as 9 tabelas aprovadas.

## 4. Regras de ouro
- Nunca leia nem exiba `backend/.env`.
- Proibido sem minha autorização: `git reset --hard`, `push --force`, apagar branches, `drizzle-kit push/drop`, `DROP`, `rm -rf`, editar migração já criada.
- Nunca commitar na branch principal nem fazer merge: eu integro.
- Dependência nova só se indispensável, justificada e com versão atual conferida na documentação oficial.
- Windows/PowerShell: use scripts npm, não assuma bash.
- Não afirme que algo está concluído sem rodar testes, lint e build. Se algo não foi testado, diga.

## 5. FASE 0 — Análise (somente leitura; não edite nada)
1. **Git:** `git status`, `git branch -a`, `git log --oneline --graph --all -n 40`. Identifique a branch principal e **qual branch tem a config do banco e qual a do Gemini**, e o que cada uma alterou (`--stat`).
2. **Repositório:** compare a árvore real com a estrutura-alvo; veja `package.json` (raiz, backend, frontend), `tsconfig`, `drizzle.config.ts`, `.gitignore` (confirme que `.env` está ignorado), nomes em `.env.example`, config do Vitest e do oxlint, e o que já existe em `frontend/`.
3. **Saúde:** rode build, lint e testes e registre o resultado.
4. **Docs:** liste divergências entre `docs/arquitetura.md`, `modelo-de-dados.md`, `requisitos.md` e o pacote de decisões.

## 6. FASE 0b — Plano (e depois PARE)
Entregue: (a) resultado da análise; (b) como integrar as branches de banco e Gemini **sem sobrescrever trabalho**; (c) para a branch 1 do plano, arquivos a criar/alterar e testes; (d) divergências e suposições; (e) **ações manuais minhas** (ex.: banco de teste `dbprototipo_test` com permissões para `dbprototipo_user`, `GEMINI_API_KEY`, `CSRF_SECRET`, senhas de demonstração). **Aguarde minha aprovação antes de escrever código.**

## 7. Depois
Trabalhe **uma branch por vez**, só quando eu disser qual (ex.: "Execute a branch 5"). Siga o protocolo e os critérios de aceite do `docs/plano-implementacao.md`, entregue o relatório de `finish-with-change-report` e pare.

**Primeira resposta esperada:** apenas as Fases 0 e 0b, sem editar arquivos.
