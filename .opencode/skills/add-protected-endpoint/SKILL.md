---
name: add-protected-endpoint
description: Procedimento para criar ou alterar endpoints REST autenticados do Projeto C (NestJS), como /auth/*, /chat/*, /admin/users, /admin/audit-events. Use ao criar controller, guard, DTO, tratamento de erro ou qualquer rota que exija sessão, CSRF ou permissão, inclusive quando o pedido for só "adicione uma rota".
---

# Adicionar um endpoint protegido

Leia antes: `docs/api-endpoints.md`, `docs/funcionalidades/auth-sessoes.md`, `docs/decisoes-fechadas.md` §6.

## Passos
1. **Rota e módulo.** Coloque em `features/<modulo>/`. Mantenha o contrato de `docs/api-endpoints.md`; rota nova entra no documento.
2. **Sessão.** Valide a sessão em toda requisição protegida: cookie `HttpOnly` → hash do segredo → sessão não expirada nem revogada → usuário ativo. Falha = 401 `AUTH_SESSION_INVALID`.
3. **CSRF.** Em POST/PUT/PATCH/DELETE valide `Origin` e o header `X-CSRF-Token`. Ausente ou inválido = 403 `AUTHZ_DENIED`, auditado. Login é a única mutação sem token.
4. **Autorização.** Guard do NestJS protege o endpoint, mas **a decisão final é do `AuthorizationService`** (permissão vigente consultada na hora, sem cache). Sem permissão = 403 `AUTHZ_DENIED`.
5. **Validação.** Corpo, params e query validados com Zod. Erro = 400 `VALIDATION_ERROR`.
6. **Identidade.** Nunca aceitar `user_id` do corpo como identidade do chamador. IDs de recursos são conferidos contra o escopo.
7. **Erros.** Formato `{ "error": { "code", "message", "traceId" } }`, códigos estáveis, mensagem segura em pt-BR. Recurso sensível fora do escopo = 404 `RESOURCE_SCOPE_DENIED`. Login inválido: mensagem genérica idêntica para usuário inexistente e senha errada.
8. **trace_id.** Gerado por requisição, propagado a serviços e auditoria, devolvido na resposta. Não é credencial.
9. **Auditoria e testes.** Skills `emit-audit-event` e `write-security-tests`. Cubra: sem sessão, sessão revogada, sem permissão, sem CSRF, permitido.

## Endpoints administrativos
`/admin/users*` exigem `users:read`/`users:manage`/`roles:assign`; `/admin/audit-events` exige `audit:read`. Ninguém concede a si privilégio superior; alterações de papel e permissão são auditadas.
