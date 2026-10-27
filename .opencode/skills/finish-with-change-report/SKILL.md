---
name: finish-with-change-report
description: Relatório obrigatório no fim de cada tarefa do Projeto C, listando o que mudou, o que foi deliberadamente deixado intocado, suposições, testes e observações. Use ao concluir qualquer tarefa, antes de dizer que terminou ou de abrir pull request.
---

# Relatório de mudanças

Ao terminar, entregue este relatório curto. Serve para o responsável conferir que **só a parte pedida foi alterada**.

## Formato
```
## Resumo
O que foi feito, em 2 a 4 linhas.

## Arquivos alterados
- caminho/arquivo.ts: o que mudou e por quê

## Deliberadamente NÃO alterado
- módulos, tabelas, configs e testes que não fazem parte da tarefa

## Testes
- Quais rodaram (Vitest), resultado, e quais bloqueios reais foram comprovados

## Suposições
- Escolhas técnicas onde a documentação era omissa (opção mais restritiva), sem virar regra de negócio

## Observações fora do escopo
- Problemas vistos em outras partes, NÃO corrigidos
```

## Conferência antes de entregar
1. O diff toca só o módulo da tarefa e seus testes? Se não, justifique cada arquivo extra ou reverta.
2. Nenhuma decisão travada foi alterada (`lock-approved-decisions`)?
3. Nenhuma dependência, config ou migração antiga foi alterada sem necessidade?
4. `.env.example` e `docs/` atualizados **apenas** onde a tarefa exigiu?
5. Checklist de `security-review-before-done` passou?

Seja honesto: se algo não foi testado ou ficou incompleto, diga explicitamente.
