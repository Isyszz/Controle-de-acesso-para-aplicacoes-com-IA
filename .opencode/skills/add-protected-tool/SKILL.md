---
name: add-protected-tool
description: Procedimento para criar ou alterar uma ferramenta que a IA pode propor no Projeto C (ex.: get_own_sales, get_team_sales, get_customer, get_admin_sales_report ou uma nova). Use sempre que a tarefa envolver registrar ferramenta, escrever schema Zod de argumentos, definir retorno, ligar ferramenta a permissão/política, ou mexer em features/tools/, mesmo que o usuário não diga "ferramenta protegida".
---

# Adicionar ou alterar uma ferramenta protegida

Princípio: **a IA propõe, o backend decide.** A ferramenta só roda depois de validada (Zod) e autorizada no executor, imediatamente antes da execução.

Leia antes: `docs/referencias/ferramentas-catalogo.md`, `docs/funcionalidades/ferramentas-protegidas.md`, `docs/decisoes-fechadas.md` §5.

## Passos
1. **Contrato.** Defina: `name` único, descrição para a IA, schema Zod **estrito** (`.strict()`, sem propriedades extras, enums fechados como `period`), permissão obrigatória, política contextual (P-0x), serviço executor, formato de retorno tipado e erros padronizados.
2. **Permissão.** Use uma permissão **já existente** no catálogo (`docs/referencias/rbac3-matriz.md`). Se precisar de uma nova, pare e pergunte: não invente permissão.
3. **Identidade.** A ferramenta nunca recebe `user_id` como entrada. O usuário vem do contexto da sessão validada.
4. **Escopo.** O filtro de escopo vai **na própria consulta** (usuário, equipe, unidade). Identificadores vindos do cliente ou da IA (`team_id`, `customer_id`, `unit_id`) são conferidos contra o escopo carregado pelo backend.
5. **Registro.** Registre no catálogo de ferramentas. Ferramenta não registrada nunca executa (`TOOL_NOT_FOUND`).
6. **Execução.** Passe pelo executor: valida Zod → autoriza (`AuthorizationService`) → executa → valida a saída antes de devolver à IA. Falha ou indisponibilidade da autorização = negar.
7. **Retorno à IA.** Só o necessário. Em negação, mensagem segura sem regras internas, segredos ou dados protegidos.
8. **Auditoria.** Use a skill `emit-audit-event`: `tool.execution.started/succeeded/failed`, `authorization.allowed/denied`, com `tool_name`, `permission_code`, `policy_id`, `reason_code`, `trace_id`.
9. **Testes.** Use a skill `write-security-tests`. Mínimo: autorizada executa · sem permissão bloqueada (spy prova que a implementação **não** foi chamada) · não autenticado bloqueado · args inválidos barrados · id fora do escopo barrado · erro do authz bloqueia.

## Não faça
- Dar à ferramenta acesso arbitrário ao banco ou a SQL.
- Confiar em `team_id`/`customer_id` sem checar escopo.
- Executar a ferramenta antes da decisão de autorização.
- Deixar a ferramenta importar Gemini ou LangChain.
