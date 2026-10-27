---
name: write-security-tests
description: Como escrever testes Vitest de segurança no Projeto C que provam bloqueios reais, não só que a aplicação respondeu. Use ao criar ou revisar testes de autenticação, sessão, RBAC3, políticas contextuais, ferramentas, auditoria ou chat/IA, ou ao decidir se uma etapa pode ser marcada como concluída.
---

# Testes de segurança com Vitest

**Somente Vitest.** Sem Jest, sem Playwright. Leia `docs/testes.md`.

## Regra de ouro
Um teste só passa com **asserção automatizada** do comportamento esperado. Responder sem erro não basta: prove que a operação proibida **não foi executada**.

## Como provar o bloqueio
- Injete a implementação da ferramenta como **spy/mock** e assegure `expect(spy).not.toHaveBeenCalled()` quando negada.
- Em negação, verifique também que nenhum dado protegido foi lido nem devolvido.
- Verifique o **evento de auditoria** esperado (tipo, `decision`, `reason_code`, `policy_id`, `trace_id`).

## Casos obrigatórios (todos devem existir)
1. Com permissão executa. 2. Sem permissão bloqueia. 3. Não autenticado bloqueia. 4. Sessão revogada/expirada bloqueia. 5. Argumentos inválidos impedem execução. 6. Ferramenta inexistente não executa. 7. Trocar identificadores não sai do escopo. 8. Falha do serviço de autorização impede execução. 9. Negação gera auditoria. 10. `trace_id` correlaciona eventos. 11. Permissão removida deixa de autorizar na verificação seguinte. 12. Logs e auditoria sem senha nem segredo de sessão.

Mais: desativar usuário invalida sessões e preserva auditoria · usuário não se concede privilégio superior · CSRF ausente é rejeitado · limites do loop de IA respeitados.

## Organização
- Unitários: credenciais, sessão, permissões, políticas P-01 a P-07, herança RBAC3, schemas Zod.
- Integração: banco de teste **isolado** (`DATABASE_URL_TEST`), nunca o de dev; limpeza entre testes; seed idempotente.
- IA: **mock do adaptador**, nunca a API real. Cubra resposta textual, proposta válida, args inválidos, ferramenta inexistente, erro/timeout.
- Dados: fixtures de `features/tools/fixtures/` com registros dentro e fora do escopo.
