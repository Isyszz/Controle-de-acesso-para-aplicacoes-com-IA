# Funcionalidade: Auditoria e Rastreabilidade (`trace_id`)

**Módulo:** `features/audit/` + utilitários em `shared/` · **Requisitos:** RF-12, RF-13, RF-14 · RNF-07, RNF-13

## O que é
O registro persistente de **o que aconteceu, quem fez, com que decisão e resultado**, permitindo investigar depois. O `trace_id` liga todos os eventos de uma mesma requisição/fluxo.

## O que faz
- Registra eventos relevantes de segurança e operação.
- Correlaciona eventos por `trace_id`.
- Disponibiliza consulta de eventos a quem tem permissão.
- Preserva registros necessários, conforme política de retenção.

## Como faz
- **Contrato de auditoria** simples: qualquer módulo registra evento com id, tipo, resultado, contexto relevante e `trace_id`.
- `trace_id` gerado no início da requisição e **propagado de forma controlada** entre os módulos (middleware/interceptor + contexto assíncrono **[Sugestão]**).
- Eventos persistidos no PostgreSQL (tabela de eventos da modelagem aprovada).
- Segredos nunca entram no registro (redigir/excluir).

### Eventos a registrar
Login ok/falho · criar/expirar/revogar sessão · desativação de conta · decisão de autorização (concedida **ou** negada) · início/conclusão/falha de ferramenta · alteração de papéis/permissões · falhas relevantes de segurança.

### Campos (conforme esquema aprovado ou equivalentes)
id do evento · data/hora · tipo · ator (se conhecido) · ação e recurso · decisão + motivo padronizado · ferramenta (se aplicável) · resultado · `trace_id` · metadados seguros.

## Para que serve
Comprovar e investigar ações e decisões; provar que bloqueios ocorreram; sustentar a demonstração de "acesso permitido, negado e rastreável".

## Onde se encaixa
Transversal: todo módulo grava; `GET /admin/audit-events` consulta (protegido por permissão).

## Regras e restrições
- **Nunca** senhas, tokens, chaves de API ou segredos de sessão em texto puro (RF-13, RNF-07).
- `trace_id` **não** é mecanismo de autenticação.
- Auditoria ≠ log técnico: finalidades diferentes, tratamentos diferentes.
- Acesso aos eventos restrito a autorizados; integridade preservada.
- Desativar usuário **não** apaga a auditoria necessária à investigação.
- Dados limitados ao necessário (privacidade); política de retenção a definir.

## Critérios de aceitação
Cenários de teste identificam evento, resultado e contexto; eventos de uma operação correlacionáveis por `trace_id`; negação gera o registro esperado; logs sem segredos.

## Testes mínimos (Vitest)
Persistência e consulta · negação gera evento · mesmo `trace_id` ao longo do fluxo · nenhum campo sensível nos registros/logs · consulta exige permissão.

## Decisões em aberto
Política de retenção (o quê, quanto tempo, quem consulta) → [pendências](../pendencias-e-lacunas.md).

## Campos e eventos definidos (especificação técnica final)
Usar a tabela `audit_events` (uma das 9 aprovadas, criada na Etapa 2); não criar tabela por tipo de evento. Campos (definir as colunas na Etapa 2): `id`, `trace_id`, `occurred_at`, `event_type`, `actor_user_id`, `session_id` (referência, sem segredo), `action`, `resource_type`, `resource_id`, `permission_code`, `policy_id`, `decision` (permitido/negado/erro), `reason_code`, `tool_name`, `status`, `duration_ms`, `metadata` (seguro).

Eventos mínimos: `auth.login.succeeded` · `auth.login.failed` · `auth.session.created` · `auth.session.revoked` · `auth.session.expired` · `auth.account.disabled` · `authorization.allowed` · `authorization.denied` · `tool.execution.started` · `tool.execution.succeeded` · `tool.execution.failed` · `user.role.changed` · `user.permission.changed`. (Taxonomia equivalente é aceita.)

Regras extras: um `trace_id` por solicitação, propagado até a ferramenta · códigos de erro estáveis · saber um `trace_id` **não** dá acesso ao resultado · alterações/exclusões de auditoria só por processo administrativo controlado · retenção compatível com finalidade, segurança e **LGPD** · eventos antigos devem explicar decisões passadas sem depender da configuração atual (ver [modelagem](../referencias/modelagem-dados.md)).
