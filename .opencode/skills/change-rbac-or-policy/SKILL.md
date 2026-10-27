---
name: change-rbac-or-policy
description: Como alterar papéis, permissões, hierarquia RBAC3, seed da matriz ou políticas contextuais P-01 a P-07 no Projeto C, incluindo o AuthorizationService. Use ao mexer em roles, role_permissions, user_roles, escopos, regras de herança, atribuição de papéis ou qualquer decisão de acesso.
---

# Alterar RBAC3 ou políticas contextuais

Leia `docs/referencias/rbac3-matriz.md`, `docs/referencias/politicas-contextuais.md`, `docs/decisoes-fechadas.md` §3.

## Fatos fixos
- Papéis: `employee`, `manager`, `administrator`. `manager` herda de `employee`; `administrator` **não** herda operacionais.
- 9 permissões: `sales:read:own`, `sales:read:team`, `sales:read:unit`, `customers:read:scoped`, `reports:read:administrative`, `users:read`, `users:manage`, `roles:assign`, `audit:read`.
- Políticas ficam no **`AuthorizationService`** em código, sem motor genérico e sem tabela de políticas.

## Passos
1. **Não invente** papel, permissão, incompatibilidade ou política. Mudança de matriz ou nova regra exige aprovação: pare e pergunte.
2. Altere a matriz no seed (idempotente) **e** na documentação juntas.
3. Hierarquia: herança por `roles.inherits_from_role_id`; rejeite ciclos.
4. Restrições RBAC3: só quem tem `roles:assign` atribui papéis; ninguém concede privilégio superior ao que pode administrar; combinação incompatível só rejeita se houver regra real declarada; usuário desativado não recebe sessão nem opera.
5. **Negar por padrão.** Sem permissão, contexto não verificável, conflito de regras ou erro técnico = negar.
6. **Sem cache** de autorização: consulte as permissões vigentes em cada verificação (P-07).
7. Toda decisão registra `policy_id` e `reason_code` na auditoria (skill `emit-audit-event`). Alterações de papel/permissão geram `user.role.changed` / `user.permission.changed`.
8. Testes (skill `write-security-tests`): herança, administrador sem acesso operacional, permissão removida deixa de valer, auto-concessão negada, escopo de equipe/unidade, P-01 a P-07.
