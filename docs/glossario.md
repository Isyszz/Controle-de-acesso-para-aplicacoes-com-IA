# Glossário

- **Autenticação:** verificar a identidade do usuário.
- **Autorização:** determinar se o usuário pode realizar uma operação.
- **RBAC3:** controle de acesso por papéis combinando hierarquia e restrições.
- **Política contextual:** regra que considera operação, recurso ou contexto para decidir o acesso.
- **Sessão opaca:** identificador cujo estado/significado é controlado pelo servidor, sem expor permissões no identificador.
- **Ferramenta (tool):** operação registrada que a IA pode propor; execução controlada pelo backend.
- **Executor de ferramentas:** componente que valida e executa ferramentas após as verificações.
- **Provedor de IA:** neste protótipo, o Gemini (Google) via Gemini API.
- **Adaptador (de IA):** camada interna que isola o provedor; o resto da app depende do contrato interno.
- **Auditoria:** registro de eventos relevantes para comprovar/investigar ações e decisões.
- **`trace_id`:** identificador que correlaciona eventos de uma mesma requisição/fluxo (não é credencial).
- **Drizzle ORM:** modelagem, consultas e migrações do banco.
- **Vitest:** framework único de testes (front e back).
- **Monólito modular:** app única organizada em módulos com responsabilidades definidas.
- **LangChain.js:** camada de integração e orquestração entre `features/ai/` e a Gemini API (parte da stack definida); restrita a esse módulo.
