# Decisões fechadas das pendências

> Resolve as pendências A, B-novo e B de [pendencias-e-lacunas](pendencias-e-lacunas.md). Origem: rodada de decisões técnicas posterior à especificação final.
> **Status: todas as pendências estão decididas.** O agente pode implementar sem perguntar. Onde um detalhe técnico não estiver aqui, ele escolhe a opção **mais restritiva** e registra a suposição na documentação, sem transformá-la em regra de negócio.
> Em caso de conflito com [regras inegociáveis](00-regras-inegociaveis.md) ou com a lista das 9 tabelas aprovadas, **vale a regra/lista** e o agente deve avisar.

## 1. Esquema físico (A1) ✅
**O schema físico é criado pelo agente na Etapa 2**, sem etapa de revisão externa. Pontos fixos: as **9 tabelas aprovadas** (nomes abaixo, sem renomear) e o contrato de colunas/restrições desta seção. Onde o contrato for omisso, o agente escolhe tipos e detalhes e registra as escolhas na documentação. Não criar tabelas fora das 9.

| Tabela aprovada | Deve representar |
|---|---|
| `clients` | Sistemas clientes (não confundir com clientes finais das ferramentas). Mantida como na modelagem. |
| `users` | `id` PK, `name`, `email` UNIQUE, `status` (ativo/inativo), `created_at`, `updated_at` (+ vínculo com `clients`, se já existir) |
| `user_credentials` | `id` PK, `user_id` FK, `password_hash` (Argon2id), `created_at`, `updated_at`, `failed_login_attempts`, `locked_until` (estado do bloqueio de login, ver B5) |
| `user_tokens` (sessões) | `id` PK, `user_id` FK, `secret_hash` UNIQUE, `created_at`, `last_activity_at`, `expires_at`, `revoked_at` e **início absoluto da sessão** (ver 6.4). Índices em usuário e validade. |
| `roles` | `id` PK, `code` UNIQUE, `name`, `inherits_from_role_id` FK opcional → `roles.id` |
| `permissions` | `id` PK, `code` UNIQUE, `description` |
| `user_roles` | FK usuário + FK papel, UNIQUE no par; quem atribuiu e quando, se previsto |
| `role_permissions` | FK papel + FK permissão, UNIQUE no par |
| `audit_events` | Campos da seção 5 da especificação (`trace_id`, `occurred_at`, `event_type`, `actor_user_id`, referência segura à sessão, `action`, `resource_type`, `resource_id`, `permission_code`, `policy_id`, `decision`, `reason_code`, `tool_name`, `status`, `duration_ms`, `metadata` sem segredos) |

Regras físicas: UUID se for o padrão do projeto · `timestamptz` · índices em FKs e em e-mail, hash da sessão, `trace_id`, data e tipo de evento · unicidade em e-mail, códigos de papel/permissão e associações · transações em alterações multi-registro · auditoria preservada ao desativar usuário ou revogar sessão.
Políticas P-01..P-07 **não** ganham tabela (ficam no `AuthorizationService`).

## 2. Dados fictícios de negócio (A2) ✅
Fixtures versionadas, determinísticas, **sem** novas tabelas de negócio:
```
features/tools/fixtures/{sales,customers,teams,units}.ts
```
Conteúdo mínimo: vendas ligadas a funcionário, equipe e unidade · clientes ligados a unidade/escopo · **≥ 2 equipes e ≥ 2 unidades** · registros fora do escopo para provar a negação · nenhum dado real. O acesso é por serviços/repositórios tipados, nunca direto de dentro de `features/ai/`.
As fixtures referenciam os usuários do seed (seção 4) por identificador estável.
**Critério:** alterar IDs enviados pelo cliente não alcança equipe, unidade ou cliente fora do escopo.

## 3. Escopo, hierarquia, hash, matriz (A3–A6)

### A3 — Escopo usuário ↔ equipe/unidade ✅
O usuário vem da sessão; escopos são carregados **pelo backend**, nunca aceitos do frontend ou da IA.
- `get_own_sales`: filtra pelo usuário autenticado.
- `get_team_sales`: filtra pelas equipes autorizadas do gerente.
- `get_customer`: confere se o cliente está no escopo.
- `get_admin_sales_report`: exige permissão administrativa explícita + contexto.
- Gerente sem equipe: negar ou retornar vazio (conforme contrato da ferramenta); **nunca** retornar tudo.

**Onde guardar o vínculo (decidido):** nas fixtures (`features/tools/fixtures/`), ligando cada usuário do seed a suas equipes e unidades. **Não** criar `user_scopes` nem qualquer 10ª tabela. O escopo é lido por um serviço tipado no backend.

### A4 — Hierarquia ✅
Herança em `roles.inherits_from_role_id` . `manager` herda `employee`; `administrator` **não** herda operacionais. Usuário pode ter vários papéis se cada atribuição for autorizada. **Sem** incompatibilidade artificial entre os 3 papéis. Rejeitar ciclos. Restrição de combinação só quando houver regra real formalizada.
**Critério:** gerente herda o básico de funcionário e não ganha acesso administrativo.

### A5 — Hash ✅
Pacote **`argon2`**, `type: argon2id` explícito; salt gerenciado pela biblioteca; parâmetros de custo configuráveis (referência OWASP; confirmar versão atual na documentação do pacote antes de instalar). `npm install argon2` no backend. Nada de algoritmo próprio.

### A6 — Seed de `role_permissions` ✅
| Permissão | employee | manager | administrator |
|---|---|---|---|
| `sales:read:own` | ✔ | ✔ (herança) | — |
| `sales:read:team` | — | ✔ | — |
| `sales:read:unit` | — | ✔ (atribuída ao papel; exige escopo de unidade) | — |
| `customers:read:scoped` | ✔ | ✔ (herança) | — |
| `reports:read:administrative` | — | — | ✔ |
| `users:read` | — | — | ✔ |
| `users:manage` | — | — | ✔ |
| `roles:assign` | — | — | ✔ |
| `audit:read` | — | — | ✔ |

`audit:read` é a **9ª permissão do catálogo** (decidida para proteger `GET /admin/audit-events`); entra no seed junto com as outras 8. Administrador recebe só as 5 administrativas; qualquer permissão operacional dele precisa ser concedida explicitamente. O seed **não** substitui a consulta a permissões vigentes em cada operação (P-07).

## 4. Seed de demonstração (A7) ✅
| Usuário | Papel/estado | Escopo |
|---|---|---|
| `employee.demo` | funcionário ativo | próprias vendas e clientes autorizados |
| `manager.demo` | gerente ativo | 1 equipe e 1 unidade |
| `admin.demo` | administrador ativo | permissões administrativas |
| `disabled.demo` | inativo | nenhuma operação |

Senhas só de ambiente de teste, definidas localmente, gravadas como hash e documentadas como fictícias. **Seed idempotente** (rodar de novo não duplica usuários, papéis, permissões nem associações).

## 5. Ferramentas (B-novo-1) ✅
Schemas Zod **estritos**; `user_id` nunca é entrada; objetos de retorno tipados; resposta validada antes de ir à IA.
`period` = `"current_month" | "last_month" | "current_year"` em todas.

| Ferramenta | Entrada | Observações |
|---|---|---|
| `get_own_sales` | `{ period }` | Saída: período, total, quantidade, agregados permitidos; filtrado pelo usuário |
| `get_team_sales` | `{ period, team_id? }` | `team_id` opcional; se informado, deve estar nos escopos autorizados; senão usa só as equipes autorizadas |
| `get_customer` | `{ customer_id }` | Escopo conferido **antes** de retornar; saída mínima (id, nome fictício, unidade) |
| `get_admin_sales_report` | `{ period, unit_id? }` | Exige `reports:read:administrative`; saída agregada, sem dados individuais desnecessários. Se `unit_id` for informado, deve existir nas fixtures; o relatório administrativo vale para **qualquer unidade existente** (não depende de escopo de unidade, pois o administrador não tem escopo de unidade). Unidade inexistente → 404 `RESOURCE_SCOPE_DENIED` |

Comuns: rejeitar propriedades extras, IDs malformados e períodos fora da lista · limites de tamanho/quantidade · erros padronizados sem stack trace · autorização **de novo** no executor mesmo que a IA tenha sugerido.

## 6. Chat, sessão e IA

### 6.1 `POST /chat/messages` ✅
JSON normal, **sem streaming** na v1. Identidade pelo cookie de sessão.
```json
// requisição
{ "message": "Quais foram minhas vendas neste mês?" }
// sucesso
{ "trace_id": "uuid", "message": "…", "tool_calls": [{ "name": "get_own_sales", "status": "succeeded" }] }
// negada (sem dados protegidos)
{ "trace_id": "uuid", "message": "Não tenho autorização para realizar essa consulta.", "error": { "code": "AUTHZ_DENIED" } }
```
Exemplos ilustrativos; valores são gerados pela aplicação. Um `trace_id` por requisição, propagado a IA, ferramentas e auditoria. 401 sessão inválida · 403 negada · 404 para recurso sensível fora do escopo. Nunca expor mensagens internas do provedor de IA.

### 6.2 / 6.3 CSRF e cookie ✅
Cookie `HttpOnly`; prod/HTTPS: `Secure` + `SameSite=Lax` inicial; dev HTTP local: não exigir `Secure` se impedir o funcionamento. Validar `Origin` em requisições que alteram estado **e** exigir token CSRF em header (`X-CSRF-Token`). `SameSite` não substitui CSRF. **Token CSRF (decidido):** valor derivado da sessão (HMAC-SHA256 do identificador da sessão com um segredo de servidor em variável de ambiente), devolvido no corpo de `POST /auth/login`, de `POST /auth/refresh` e de `GET /auth/me`. O frontend o guarda **em memória** e o envia em `X-CSRF-Token` em POST/PUT/PATCH/DELETE. Token ausente ou inválido → 403 `AUTHZ_DENIED`, auditado. Login é a única mutação sem token.

### 6.4 `POST /auth/refresh` ✅
Valida sessão atual e estado do usuário → recusa expirada/revogada → novo segredo aleatório (guarda só o hash) → invalida a anterior **na mesma transação** → novo cookie → audita. Limites 30 min/8 h, configuráveis. Nunca renova sessão revogada. **O limite absoluto de 8 h conta desde o login original**, e a nova sessão herda esse início absoluto (senão o refresh burlaria o limite).

### 6.5 Limites do loop de IA ✅
Por mensagem: **máx. 5 iterações** e **máx. 4 chamadas de ferramenta** (valores configuráveis), impostos pelo backend. Ao atingir: parar, não executar mais nada, auditar com `reason_code`, responder de forma segura. Sem retry automático de operação que altere dados.

### 6.6 P-06 reescrita ✅
> O usuário não pode consultar dados de um cliente final, de uma equipe ou de uma unidade fora do seu escopo autorizado, mesmo que altere manualmente os identificadores enviados à API ou sugeridos pela IA.

`customer` = cliente final de `get_customer`, **não** a tabela `clients`.

## 7. Decisões complementares (B1–B8)
| # | Decisão |
|---|---|
| B1 | Retenção de auditoria: **365 dias**, configurável (`AUDIT_RETENTION_DAYS`). Na v1 **não há exclusão automática**; remoção só por processo administrativo controlado. Leitura exige `audit:read` (só `administrator`). Ajustar o prazo com a finalidade e a LGPD quando sair do protótipo |
| B2 | Histórico do chat **em memória** na v1; sem tabela; não é registro de auditoria |
| B3 | Variáveis de ambiente: usar os nomes de [ambiente-config](ambiente-config.md) |
| B4 | 403 quando o recurso é identificável e falta permissão; 404 para recurso sensível cuja existência não deve ser confirmada; aplicar de forma consistente |
| B5 | Limitação de tentativas de login: contagem e bloqueio guardados em `user_credentials` (`failed_login_attempts`, `locked_until`). Padrão: 5 falhas seguidas → bloqueio temporário de 15 min (configuráveis); sucesso zera a contagem; sem bloqueio permanente. Resposta genérica idêntica em qualquer falha (não revela se a conta existe) e auditoria de cada falha |
| B6 | Modelo Gemini: escolher na implementação, via variável de ambiente, validar suporte a tool calling e documentar |
| B7 | Sem metas numéricas; medir latência de API, autorização, ferramentas e IA |
| B8 | Docker Compose opcional; app deve rodar localmente só com o `.env` |

Regras adicionais: acesso à auditoria exige autorização própria (ser administrador não basta) · `trace_id` não é credencial · dependência indisponível → nenhuma ferramenta protegida executa · IA recebe só contexto necessário · suposições do agente vão para a documentação, mas **não viram regra de negócio sem aprovação**.

## 8. Sem pendências bloqueantes
Nada mais depende de confirmação humana para iniciar. Verificações que o **próprio agente** faz durante a implementação (sem perguntar, registrando o resultado):
1. Confirmar a versão atual do pacote `argon2` e os parâmetros de custo recomendados pela OWASP.
2. Escolher o modelo Gemini na documentação oficial e confirmar suporte a chamada de ferramentas (variável `GEMINI_MODEL`).
3. Confirmar as versões atuais de LangChain.js, Drizzle e NestJS antes de fixar dependências.
4. Medir latência (B7) apenas como registro, sem metas.

O que seguir exigindo decisão humana **só** surge se o agente precisar quebrar uma regra inegociável: nesse caso, parar e perguntar.
