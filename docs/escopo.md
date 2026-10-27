# Escopo e atores

## Dentro do escopo
- **Autenticação e sessões:** login, verificação de credenciais, identificação do usuário, criar/validar sessões, logout/revogação, estado da conta, sessões inválidas/expiradas.
- **Autorização:** usuários↔papéis, papéis↔permissões, RBAC3, hierarquia, políticas contextuais, escopo de dados, bloqueio por padrão.
- **Assistente de IA:** interface de chat, envio ao backend, integração com Gemini, interpretação, identificação de ferramentas, tratamento de respostas/erros/negações.
- **Ferramentas protegidas:** registro explícito, validação de args, permissões por ferramenta, checagem imediatamente antes de executar, consultas demonstrativas de vendas e clientes, ao menos uma operação administrativa restrita, retorno controlado.
- **Auditoria:** tentativas de autenticação, decisões de autorização, execuções, falhas relevantes, alterações de papéis/permissões, correlação por `trace_id`, retenção conforme política.
- **Persistência:** PostgreSQL + Drizzle, modelagem aprovada, migrações, configuração de ambiente.
- **Interface e testes:** React, Vite, Zod, testes unitários e de integração **somente com Vitest**.

## Fora do escopo inicial (não implementar sem mudança formal)
- Microserviços / arquitetura distribuída.
- Execução arbitrária de código pela IA.
- Acesso direto da IA ao banco.
- Ferramentas não registradas/autorizadas.
- Integração com sistemas corporativos reais sem necessidade demonstrada.
- Múltiplos provedores de IA como requisito obrigatório.
- Login OIDC/SSO.
- Testes E2E com Playwright.
- Jest.
- Implantação em infraestrutura de produção.

Foco: comprovar o funcionamento integrado dos mecanismos de segurança **em ambiente controlado**.

## Atores
| Ator | Papel |
|---|---|
| **Funcionário** | Acessa o sistema, usa o chat e executa o que lhe for autorizado |
| **Administrador** | Executa operações administrativas **explicitamente concedidas** (usuários, papéis, permissões). Não recebe automaticamente todas as permissões de negócio |
| **Backend** | Processa requisições, valida sessões, aplica políticas, executa ferramentas autorizadas, registra eventos |
| **Provedor de IA (Gemini)** | Interpreta solicitações e propõe ferramentas. **Não** é autoridade de autenticação/autorização |
| **Equipe de desenvolvimento** | Implementa, configura, testa, documenta e verifica critérios de aceitação |
