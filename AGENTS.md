# Instruções para o agente — Projeto C

**A IA propõe. O backend decide.** Projeto C: assistente de IA com ferramentas protegidas (NestJS + Drizzle/PostgreSQL + Zod + Gemini via LangChain.js, Vitest, React/Vite).

## Leitura em camadas (não leia tudo de uma vez)
**Sempre (início de qualquer tarefa):**
1. Este arquivo
2. `docs/00-regras-inegociaveis.md`
3. `docs/decisoes-fechadas.md` (decisões já tomadas: não pergunte o que já está decidido)

**Só quando a tarefa pedir:**
- Plano e branches: `docs/plano-implementacao.md`
- Arquitetura e pastas: `docs/01-arquitetura.md`, `docs/02-stack-e-convencoes.md`
- A funcionalidade em questão: um arquivo de `docs/funcionalidades/` (ver mapa em `docs/mapa-de-documentos.md`)
- Matriz, políticas, catálogo de ferramentas, modelagem: `docs/referencias/`
- API, testes, ambiente: `docs/api-endpoints.md`, `docs/testes.md`, `docs/ambiente-config.md`

**Precedência em conflito:** regras inegociáveis > decisões fechadas > estrutura de pastas do repositório > demais docs. Divergências entre docs: registre e siga a precedência, sem escolher em silêncio.

## Como trabalhar
- Uma branch por feature, uma por vez, conforme `docs/plano-implementacao.md`. Nunca commitar na branch principal, nunca `push --force`, nunca fazer merge.
- Nunca ler nem exibir `backend/.env` (use `.env.example`).
- Detalhe omisso: opção mais restritiva em segurança + registrar a suposição. Quebrar regra inegociável ou decisão fechada: parar e perguntar.
- Nada está concluído sem testes Vitest comprovando, inclusive que operações proibidas **não** executaram.

## Skills (`.opencode/skills/`)
**Em toda tarefa:** `stay-in-scope` (antes de editar) · `lock-approved-decisions` · `finish-with-change-report` (ao terminar).
**Conforme o trabalho:** `add-protected-endpoint` · `add-protected-tool` · `change-rbac-or-policy` · `emit-audit-event` · `ai-adapter-integration` · `safe-database-changes` · `write-security-tests` · `dependency-and-config-discipline` · `respect-module-boundaries` · `work-one-stage-at-a-time` · `security-review-before-done`.
