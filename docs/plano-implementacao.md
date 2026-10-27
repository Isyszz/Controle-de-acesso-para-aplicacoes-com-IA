# Plano de implementação e critérios de aceitação

Seguir a ordem: reduz dependências e permite validar cada etapa. Marque `[x]` ao concluir (**só** após testes comprovarem).

## Etapas

### Etapa 1 — Preparação do repositório
- [ ] Criar/organizar pastas `frontend/` e `backend/`
- [ ] Configurar TypeScript e scripts de desenvolvimento
- [ ] Configurar Vitest em ambos
- [ ] Variáveis de ambiente e instruções iniciais (`.env.example`)
- [ ] Verificar que as aplicações executam

### Etapa 2 — Persistência → [persistencia](funcionalidades/persistencia.md)
- [ ] Configurar PostgreSQL + Drizzle
- [ ] Criar o esquema Drizzle a partir das 9 tabelas aprovadas e do contrato de [decisoes-fechadas](decisoes-fechadas.md) §1 (sem tabelas extras)
- [ ] Preparar migrações
- [ ] Verificar conexão e consultas
- [ ] Testes de persistência

### Etapa 3 — Autenticação e sessões → [auth-sessoes](funcionalidades/auth-sessoes.md)
- [ ] Login · verificação de credenciais (Argon2id)
- [ ] Sessões opacas · logout e revogação
- [ ] Testes: válidas, inválidas, expiradas

### Etapa 4 — Autorização → [autorizacao-rbac3](funcionalidades/autorizacao-rbac3.md)
- [ ] Matriz RBAC3
- [ ] Políticas contextuais aprovadas
- [ ] Decisão centralizada
- [ ] Testes: permissões, hierarquia, escopo, restrições

### Etapa 5 — Auditoria → [auditoria-trace-id](funcionalidades/auditoria-trace-id.md)
- [ ] Registro de eventos
- [ ] Integração do `trace_id`
- [ ] Registrar decisões e resultados
- [ ] Testes de persistência e consulta

### Etapa 6 — Ferramentas protegidas → [ferramentas-protegidas](funcionalidades/ferramentas-protegidas.md)
- [ ] Registro de ferramentas
- [ ] Contratos e esquemas de validação
- [ ] Ferramentas demonstrativas (vendas, clientes, 1 admin restrita)
- [ ] Executor integrado à autorização
- [ ] Verificar que operações negadas **não** produzem efeitos

### Etapa 7 — Integração com IA → [ia-gemini-langchain](funcionalidades/ia-gemini-langchain.md)
- [ ] Gemini API + chave por variável de ambiente (backend)
- [ ] Adaptador de IA
- [ ] Chat integrado ao registro de ferramentas
- [ ] Propostas da IA nunca executam sem validação
- [ ] Testes: respostas válidas, erros, negadas

### Etapa 8 — Interface e integração final → [frontend](funcionalidades/frontend.md), [chat](funcionalidades/chat.md)
- [ ] Telas de login e chat
- [ ] Frontend ↔ API
- [ ] Resultados e mensagens de erro
- [ ] Executar testes unitários e de integração
- [ ] Validar critérios gerais de aceitação

### Etapa 9 — Documentação e demonstração
- [ ] Instalação e execução
- [ ] Endpoints e contratos
- [ ] Configuração do ambiente
- [ ] Resultados dos testes
- [ ] Cenários de demonstração: permitido, negado, rastreável

> Gestão de usuários/admin ([usuarios-admin](funcionalidades/usuarios-admin.md)) não tem etapa própria no original. **Decidido:** implementar após autenticação e autorização (Etapas 3–4), com endpoints `/admin/*` protegidos e testes de permissão; a auditoria administrativa fecha na Etapa 5. Dados de demonstração e seeds: ver [decisoes-fechadas](decisoes-fechadas.md) §2 e §4.

## Critérios gerais de aceitação do protótipo

- [ ] Funcionário consegue autenticar-se
- [ ] Sessão é validada em operações protegidas
- [ ] Logout invalida a sessão
- [ ] Matriz de papéis/permissões aplicada corretamente
- [ ] Políticas contextuais restringem acesso aos recursos autorizados
- [ ] IA consegue propor ferramentas registradas
- [ ] Argumentos validados antes da execução
- [ ] Ferramentas autorizadas executam o previsto
- [ ] Ferramentas não autorizadas são bloqueadas pelo backend
- [ ] Falhas no serviço de autorização não permitem execução
- [ ] Alterar identificadores não ultrapassa o escopo
- [ ] Eventos relevantes registrados na auditoria
- [ ] `trace_id` correlaciona eventos
- [ ] PostgreSQL persiste os dados da modelagem aprovada
- [ ] Testes Vitest (unitários e integração) cobrem cenários críticos
- [ ] Configuração e execução documentadas

Avaliar com **testes automatizados e demonstrações funcionais**; código existir não é conclusão.

---

# Branches de implementação (uma feature = uma branch)

> Convenção: `chore/…` ou `feat/…`. Base = branch principal atualizada (ou a branch anterior, se ainda não integrada, avisando). Commits pequenos. Nunca commitar na principal, nunca `push --force`, nunca fazer merge (o responsável integra). Detalhes das decisões: [decisoes-fechadas](decisoes-fechadas.md).
> **Ajuste de ordem:** `audit-core` vem antes de `auth` porque login e autorização já emitem eventos; registrar essa ordem em `docs/`.

| # | Branch | Escopo e entregas | Aceite |
|---|---|---|---|
| 1 | `chore/integrar-base` | Integrar branches de banco e Gemini sem perder trabalho; alinhar pastas à estrutura-alvo; `drizzle.config.ts` → `src/infrastructure/database/schema.ts`; scripts npm; Vitest e oxlint rodando | build, lint e testes verdes; nada anterior perdido |
| 2 | `feat/fundacao` | Config com validação Zod das variáveis (sem logar segredos); `shared/errors` (formato `{ error: { code, message, traceId } }`); `shared/trace` (gera e devolve `trace_id`); `shared/logging` com redação de segredos; filtro global de exceções; health check | testes: formato de erro, `trace_id`, segredo fora do log |
| 3 | `feat/schema-e-seeds` | `schema.ts` das 9 tabelas ([decisoes-fechadas](decisoes-fechadas.md) §1); `index.ts` de conexão; migração inicial; seed idempotente (papéis, 9 permissões, matriz §3 A6, 4 usuários demo); fixtures (≥2 equipes, ≥2 unidades, registros fora do escopo) | migração aplica do zero; seed roda 2x sem duplicar; constraints testadas em banco de teste |
| 4 | `feat/audit-core` | `AuditService.record(...)`, propagação do `trace_id`, redação de segredos, taxonomia de eventos e `reason_code` | evento gravado com `trace_id`; sem segredo; falha de auditoria não libera operação protegida |
| 5 | `feat/sessions` | Criar/validar/renovar/revogar sessão (só o hash no banco); expiração 30 min / 8 h; cookie; token CSRF + `Origin`; guard; invalidar ao desativar usuário ou trocar senha | expirada/revogada rejeitada; refresh herda início absoluto; CSRF ausente rejeitado |
| 6 | `feat/auth` | `POST /auth/login`, `/auth/logout`, `/auth/refresh`, `GET /auth/me`; Argon2id; erro genérico idêntico; bloqueio 5 falhas / 15 min; auditoria de login | login válido/inválido; bloqueio; logout invalida; inativo não loga; senha fora de log |
| 7 | `feat/authorization` | RBAC3, 9 permissões, `AuthorizationService` com P-01..P-07, restrições de atribuição, sem cache, negar por padrão, auditoria com `policy_id`/`reason_code` | matriz completa; escopo; permissão removida deixa de valer; auto-concessão negada; erro = negação |
| 8 | `feat/users-admin` | `/admin/users`, `PATCH /admin/users/:id/status`, `PUT /admin/users/:id/roles`; auditoria de mudanças | testes de permissão e de não-escalonamento |
| 9 | `feat/tools` | Catálogo e executor protegido; 4 ferramentas com schemas da §5; auditoria `tool.execution.*` | permitida executa; negada **não** executa (spy); desconhecida; args inválidos; fora do escopo |
| 10 | `feat/ai-chat` | `features/ai/` (Gemini via LangChain.js, `GEMINI_MODEL`); loop 5 iterações / 4 ferramentas; `POST /chat/messages`; `GET /chat/tools`; tudo via executor | adaptador **mockado**: texto, proposta válida, args inválidos, inexistente, timeout, limite, contorno |
| 11 | `feat/audit-consulta` | `GET /admin/audit-events` com `audit:read`; retenção 365 dias configurável | testes de acesso e de não vazamento |
| 12 | `feat/frontend` | Login, chat, resultados e erros em pt-BR com `trace_id`; CSRF só em memória | build ok; fluxo manual documentado |
| 13 | `chore/validacao-final` | Suíte completa e de segurança ponta a ponta; atualizar `docs/arquitetura.md`, `modelo-de-dados.md`, `requisitos.md` e `README.md` | checklist de `security-review-before-done` 100% |

## Protocolo de cada branch
1. Criar a branch e escrever um mini-plano (arquivos, o que NÃO muda, testes).
2. Carregar as skills aplicáveis (ex.: `add-protected-endpoint`, `safe-database-changes`, `emit-audit-event`, `write-security-tests`).
3. Implementar com diff mínimo, só no módulo da branch.
4. Rodar testes, lint e build; corrigir o próprio código (nunca enfraquecer testes).
5. Aplicar `security-review-before-done` e entregar o relatório de `finish-with-change-report`.
6. **Parar** e aguardar o responsável.

## Definição de "funcionalmente concluído" (testes com Gemini mockado + smoke manual com Gemini real)
1. `employee.demo` pergunta suas vendas → só as dele.
2. `employee.demo` pede relatório administrativo → negado, ferramenta não executa, `authorization.denied` auditado.
3. `manager.demo` consulta a equipe → só equipes autorizadas; `team_id` de outra equipe → negado.
4. `admin.demo` obtém `get_admin_sales_report`; sem acesso operacional sem permissão explícita.
5. `disabled.demo` não loga; desativar usuário logado invalida sessões e preserva auditoria.
6. Sessão revogada/expirada → 401; CSRF ausente → 403.
7. Trocar `team_id`/`customer_id` manualmente não sai do escopo.
8. Um mesmo `trace_id` correlaciona entrada, decisão, execução e resposta.
9. Nenhum segredo (senha, sessão, CSRF, chave) em log ou auditoria.
