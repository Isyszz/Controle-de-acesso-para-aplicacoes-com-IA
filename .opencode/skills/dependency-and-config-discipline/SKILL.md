---
name: dependency-and-config-discipline
description: Disciplina para dependências, configurações e arquivos de ambiente do Projeto C: não adicionar bibliotecas, não trocar ferramentas e não alterar configs fora do necessário. Use ao instalar pacote, mexer em package.json, tsconfig, Vitest, ESLint, CI, Docker, .env.example ou .gitignore.
---

# Dependências e configuração

## Dependências
1. **Não instale pacote novo** sem necessidade clara da tarefa. Prefira o que a stack já tem (NestJS, Drizzle, Zod, Vitest, `argon2`, LangChain.js).
2. **Proibido:** Jest, Playwright, outro framework de teste, ORM alternativo, outra lib de hash, SDK de IA fora de `features/ai/`.
3. Antes de fixar versão, confirme a versão atual na documentação oficial do pacote. Fixe versões e mantenha o lockfile consistente.
4. Não atualize dependências existentes "de passagem". Atualização é tarefa própria.
5. Pacote novo só se: a tarefa exige, não há alternativa na stack, e você registra o motivo no relatório final.

## Configuração
1. Não altere `tsconfig`, regras de lint/format, config do Vitest, scripts do `package.json`, CI ou Docker **fora do que a tarefa exige**. Se precisar, mude o mínimo e registre.
2. Variável de ambiente nova: adicione em `.env.example` (sem valor real) **e** em `docs/ambiente-config.md`. Nunca coloque segredo em arquivo versionado.
3. `.env` com segredos nunca é versionado; não remova entradas do `.gitignore`.
4. Não renomeie variáveis já documentadas.
5. TypeScript estrito; não afrouxe `strict`, não adicione `any` em fronteiras de módulo nem `@ts-ignore` para "passar".
6. Não desative, pule (`skip`/`only`) nem enfraqueça testes ou regras de lint para fazer algo passar.
