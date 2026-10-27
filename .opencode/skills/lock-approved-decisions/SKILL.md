---
name: lock-approved-decisions
description: Lista das decisões já fechadas do Projeto C que o agente não pode mudar por conta própria (stack, 9 tabelas, papéis, permissões, políticas, contratos, limites). Use antes de qualquer mudança que toque stack, banco, papéis, permissões, políticas, endpoints, formato de erro, variáveis de ambiente ou testes, e sempre que uma "melhoria" parecer razoável.
---

# Decisões travadas

Fonte: `docs/decisoes-fechadas.md`, `docs/00-regras-inegociaveis.md`, `docs/riscos-e-decisoes.md`. Mudar qualquer item abaixo **exige pedido explícito do responsável**. Sem isso: não mude; se achar que há um problema, **registre e pergunte**.

## Travado
- **Stack:** React + Vite + TypeScript; NestJS (monólito modular); PostgreSQL + Drizzle; Zod; Gemini via LangChain.js em `features/ai/`; **somente Vitest**; Argon2id (`argon2`).
- **Estrutura:** `features/`, `infrastructure/`, `shared/`. Nada de microserviços.
- **Banco:** só as 9 tabelas aprovadas (`clients`, `users`, `user_credentials`, `user_tokens`, `permissions`, `roles`, `user_roles`, `role_permissions`, `audit_events`). Sem `user_scopes`, `auth_providers`, `external_identities`, `authorization_policies`.
- **Papéis:** `employee`, `manager`, `administrator` (admin não herda operacionais).
- **Permissões:** as 9 do catálogo e a matriz do seed (`docs/referencias/rbac3-matriz.md`).
- **Políticas:** P-01 a P-07 no `AuthorizationService`, sem motor genérico.
- **Ferramentas:** as 4 do catálogo e seus schemas (`docs/decisoes-fechadas.md` §5).
- **Sessão:** opaca, cookie `HttpOnly`, 30 min de inatividade / 8 h absoluto (configuráveis); CSRF com `X-CSRF-Token`; refresh herda o início absoluto.
- **API:** rotas e códigos de erro de `docs/api-endpoints.md`; chat em JSON, sem streaming.
- **IA:** limites 5 iterações / 4 chamadas; histórico em memória.
- **Segurança:** negar por padrão; falha técnica = negação; identidade só da sessão.

## Como agir diante de um conflito
1. Pare a mudança.
2. Descreva o conflito (o que a tarefa pede × o que está travado) e a opção mais restritiva.
3. Peça confirmação ao responsável. Se a tarefa for bloqueada por isso, entregue o resto e deixe esse ponto registrado no relatório (`finish-with-change-report`).

Suposição técnica registrada **não** vira regra de negócio sem aprovação.
