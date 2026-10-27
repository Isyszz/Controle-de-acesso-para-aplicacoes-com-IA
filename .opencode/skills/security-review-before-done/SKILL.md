---
name: security-review-before-done
description: Checklist de revisão de segurança antes de marcar qualquer tarefa ou etapa do Projeto C como concluída. Use ao terminar uma funcionalidade, antes de dizer que algo está pronto, ao marcar itens do plano de implementação ou ao fazer revisão final das etapas 1 a 9.
---

# Revisão antes de concluir

Uma funcionalidade só está pronta quando **testes automatizados comprovam**, inclusive que operações proibidas não foram executadas. Código existir não é conclusão.

## Checklist
- [ ] A identidade vem da **sessão validada**, nunca do corpo, argumentos ou saída da IA?
- [ ] Há autorização no servidor **imediatamente antes** da ação protegida?
- [ ] Erro ou indisponibilidade da autorização resulta em **negação**?
- [ ] Argumentos validados com Zod antes de usar (e formato válido ≠ autorizado)?
- [ ] Escopo aplicado **na consulta**, não só na interface?
- [ ] Auditoria gravada (permitido **e** negado) com `trace_id`, `policy_id` e `reason_code`?
- [ ] Nenhum segredo (senha, sessão, CSRF, chave) em log, auditoria ou resposta?
- [ ] Erros com código estável, sem detalhes internos; login inválido com mensagem genérica?
- [ ] Teste Vitest cobre caso positivo, negativo e **bloqueio real** (spy não chamado)?
- [ ] Nada fora de `features/ai/` depende de Gemini/LangChain?
- [ ] Só as 9 tabelas aprovadas; nenhuma tabela, papel ou permissão inventados?
- [ ] Nada fora de escopo foi implementado (OIDC/SSO, E2E, Jest/Playwright, execução arbitrária de código)?
- [ ] Documentação atualizada (endpoints, variáveis de ambiente, suposições registradas)?

## Ao fechar
Marque `[x]` no `docs/plano-implementacao.md` **somente** após os testes passarem. Registre suposições feitas, sem transformá-las em regra de negócio.
