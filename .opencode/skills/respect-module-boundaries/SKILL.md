---
name: respect-module-boundaries
description: Fronteiras entre os módulos do Projeto C (features/auth, users, authorization, chat, ai, tools, audit, infrastructure/database, shared, frontend): quem pode depender de quem e o que cada módulo pode ou não alterar. Use ao criar imports entre módulos, mover lógica, criar arquivos novos ou quando uma mudança parecer precisar de edição em mais de um módulo.
---

# Respeitar as fronteiras entre módulos

Módulos conversam por **contratos** (interfaces/tipos), nunca pela implementação interna do outro. Leia `docs/01-arquitetura.md`.

## Dono de cada responsabilidade
| Módulo | É dono de | Não faz |
|---|---|---|
| `features/auth/` | login, logout, refresh (endpoints), verificação de credenciais Argon2id, bloqueio de tentativas | decidir permissões, gerir o ciclo de vida da sessão (chama `sessions`) |
| `features/sessions/` | ciclo de vida da sessão (criar, validar, renovar, revogar), cookie, token CSRF, guard de sessão | verificar senha, decidir permissões |
| `features/authorization/` | decisão de acesso (RBAC3 + P-01..P-07) | autenticar, executar ferramenta |
| `features/users/` | consulta e gestão de usuários/papéis | decidir permissões por conta própria |
| `features/tools/` | catálogo, validação Zod, executor, fixtures | falar com Gemini/LangChain, decidir permissões fora do `AuthorizationService` |
| `features/ai/` | adaptador Gemini/LangChain.js | executar ferramenta, acessar banco |
| `features/chat/` | coordenar mensagem → IA → executor | depender de detalhes da API do Gemini |
| `features/audit/` | gravar e consultar eventos | decidir acesso |
| `infrastructure/database/` | conexão, schema, migrações | regra de negócio |
| `shared/` | erros padronizados, tipos, logging, `trace_id` | lógica de negócio |
| `frontend/` | telas e chamadas à API | qualquer decisão de segurança |

## Regras
1. **Dependa do contrato**, não do arquivo interno de outro módulo. Se o contrato não existe, proponha-o em vez de importar a implementação.
2. Gemini e LangChain.js **só** em `features/ai/`.
3. A decisão de acesso é **sempre** do `AuthorizationService`. Nenhum outro módulo replica regra de permissão.
4. `shared/` não vira depósito de lógica de negócio.
5. Nenhuma ferramenta acessa o banco livremente: usa serviço de negócio restrito.
6. O frontend nunca é fronteira de segurança e não duplica regra de autorização.
7. Sem dependência circular entre módulos.
8. Ao precisar de algo de outro módulo que ele não expõe, **não edite o outro módulo**: peça ao responsável ou registre como pendência.
