---
name: work-one-stage-at-a-time
description: Faz o agente seguir o plano de implementação do Projeto C uma etapa por vez, sem adiantar nem refazer etapas. Use ao iniciar uma etapa, ao decidir o que fazer a seguir, ao marcar itens em docs/plano-implementacao.md ou quando a tarefa não disser a qual etapa pertence.
---

# Uma etapa por vez

Plano: `docs/plano-implementacao.md` (Etapas 1 a 9). Ordem: preparação → persistência → autenticação → autorização → (usuários/admin) → auditoria → ferramentas → IA → frontend → documentação.

## Regras
1. Identifique a **etapa atual** e leia o documento da funcionalidade dela antes de codar.
2. **Não adiante** a etapa seguinte, nem "prepare terreno" com código de etapas futuras (ex.: não escrever o adaptador de IA durante a Etapa 3).
3. **Não refaça** etapas concluídas. Se achar defeito numa etapa anterior, registre como observação ou abra uma tarefa de correção específica, sem reescrever.
4. Dependências entre etapas: se a etapa atual precisa de algo que ainda não existe, crie apenas o **mínimo (contrato/interface ou stub claramente marcado)** e registre.
5. Marque `[x]` no plano **somente** quando os testes comprovarem (veja `security-review-before-done`). Não marque item de outra etapa.
6. Ao terminar a etapa, **pare** e entregue o relatório (`finish-with-change-report`). Não inicie a próxima sem pedido.
7. Se a tarefa pedida não corresponder a nenhuma etapa, pergunte onde ela se encaixa.
