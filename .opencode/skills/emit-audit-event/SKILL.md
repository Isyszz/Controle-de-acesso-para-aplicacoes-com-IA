---
name: emit-audit-event
description: Como registrar eventos de auditoria e propagar o trace_id no Projeto C. Use ao implementar login, sessão, decisões de autorização, execução de ferramentas, alterações de papéis/permissões, erros ou qualquer fluxo que precise ser rastreável, e ao escrever testes de auditoria.
---

# Registrar auditoria e trace_id

Leia `docs/funcionalidades/auditoria-trace-id.md`. Tabela única `audit_events`; não crie tabela por tipo de evento.

## Eventos mínimos
`auth.login.succeeded` · `auth.login.failed` · `auth.session.created` · `auth.session.revoked` · `auth.session.expired` · `auth.account.disabled` · `authorization.allowed` · `authorization.denied` · `tool.execution.started` · `tool.execution.succeeded` · `tool.execution.failed` · `user.role.changed` · `user.permission.changed`. Registre também: renovação de sessão, bloqueio de login, limite do loop de IA atingido e CSRF rejeitado.

## Campos
`id`, `trace_id`, `occurred_at`, `event_type`, `actor_user_id`, referência segura à sessão, `action`, `resource_type`, `resource_id`, `permission_code`, `policy_id` (P-0x), `decision` (permitido/negado/erro), `reason_code` estável, `tool_name`, `status`, `duration_ms`, `metadata` seguro.

## Regras
1. Um `trace_id` por requisição, propagado até a execução da ferramenta e devolvido na resposta.
2. **Registre permitido e negado**, e alterações administrativas.
3. **Nunca** grave senha, segredo de sessão, token CSRF, chave de API ou mensagem que vaze dado sensível. Use `reason_code`, não texto livre.
4. Guarde `permission_code`, `policy_id` e `reason_code` no evento: configuração futura pode mudar e o histórico precisa se explicar sozinho.
5. Não apague eventos ao desativar usuário. Alteração/exclusão só por processo administrativo controlado.
6. Falha ao gravar auditoria de uma operação protegida não deve liberar a operação.
7. Leitura exige `audit:read`. Retenção padrão 365 dias (`AUDIT_RETENTION_DAYS`), sem exclusão automática.
8. `trace_id` é correlação, nunca autenticação.
