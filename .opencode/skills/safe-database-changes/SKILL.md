---
name: safe-database-changes
description: Como mexer no banco do Projeto C com segurança (schema Drizzle, migrações, seeds), sem alterar tabelas ou dados fora da tarefa. Use ao criar o schema na Etapa 2, adicionar coluna ou índice, escrever migração, criar seed ou alterar consultas do Drizzle.
---

# Mudanças seguras no banco

Leia `docs/funcionalidades/persistencia.md`, `docs/referencias/modelagem-dados.md`, `docs/decisoes-fechadas.md` §1.

## Regras
1. Estrutura muda **só por migração Drizzle versionada**. Nada de `ALTER`/`DROP` manual nem `push` em banco compartilhado.
2. **Nunca edite uma migração já criada.** Mudou de ideia? Crie uma migração nova.
3. Só as **9 tabelas aprovadas**. Não crie tabela nova (nem `user_scopes`) e não renomeie as aprovadas (`user_tokens`, não `sessions`).
4. Mexa **somente nas tabelas da tarefa**. Alterar relacionamentos, chaves ou restrições de outras tabelas exige pedido explícito.
5. Prefira mudanças **aditivas** (nova coluna com default seguro, novo índice). Sem remoção de coluna ou dado sem pedido explícito.
6. Padrões físicos: `timestamptz`, UUID se for o padrão adotado, índices em FKs e campos de busca, UNIQUE onde previsto, transações em operações multi-registro.
7. **Seed idempotente:** rodar duas vezes não duplica usuários, papéis, permissões nem associações; não apaga dados que não criou.
8. Nunca grave senha em texto puro, segredo de sessão ou token CSRF. Auditoria não é apagada ao desativar usuário.
9. Testes de integração usam **banco de teste isolado** (`DATABASE_URL_TEST`); nunca rodar testes ou seeds de teste contra o banco de desenvolvimento.
10. Consultas sempre pelo Drizzle (parametrizadas); escopo aplicado **na própria consulta**.

## Ao terminar
Verifique que a migração aplica **do zero**, que as constraints (unicidade/FK) funcionam e que nenhuma tabela fora da tarefa mudou. Liste no relatório o que foi criado e o que ficou intocado.
