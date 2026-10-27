# Arquitetura

## Estilo

**Monólito modular** no backend (NestJS) + frontend separado (React/Vite). Escolhido para reduzir complexidade operacional mantendo responsabilidades separadas, sem comunicação entre microserviços. Módulos rodam na mesma aplicação, com responsabilidades claras e dependências explícitas.

## Visão geral (conceitual)

```
FRONTEND (React + Vite)  — login e chat
        │  HTTP / API
        ▼
BACKEND (NestJS)
  Auth / Sessões
      ▼
  Chat / Adaptador de IA  ───────►  Provedor de IA (Gemini API)
      ▼
  Registro e execução de tools
      ▼
  Autorização / Políticas
      ▼
  Serviços de negócio e dados
      ▼
  PostgreSQL / Drizzle

  Auditoria e trace_id: transversais a tudo
```

O diagrama é conceitual: a implementação pode organizar chamadas de outra forma **desde que preserve as fronteiras de segurança e responsabilidades**.

## Módulos do backend

| Módulo | Responsabilidade | Doc |
|---|---|---|
| `features/auth/` | Login, validação de credenciais, criar/validar/revogar sessões, proteger rotas autenticadas | [auth-sessoes](funcionalidades/auth-sessoes.md) |
| `features/users/` | Consulta e gestão de usuários, respeitando permissões administrativas | [usuarios-admin](funcionalidades/usuarios-admin.md) |
| `features/authorization/` | Avaliar permissões, hierarquia de papéis e políticas contextuais; **centralizar** a decisão | [autorizacao-rbac3](funcionalidades/autorizacao-rbac3.md) |
| `features/chat/` | Receber mensagens, coordenar o processamento, integrar resposta da IA ao fluxo de ferramentas | [chat](funcionalidades/chat.md) |
| `features/ai/` | Comunicação com o Gemini via adaptador; converte respostas em estruturas internas | [ia-gemini-langchain](funcionalidades/ia-gemini-langchain.md) |
| `features/tools/` | Catálogo de ferramentas, validação de argumentos, execução controlada | [ferramentas-protegidas](funcionalidades/ferramentas-protegidas.md) |
| `features/audit/` | Registrar eventos de segurança e disponibilizar consulta a usuários autorizados | [auditoria-trace-id](funcionalidades/auditoria-trace-id.md) |
| `infrastructure/database/` | Conexão PostgreSQL, Drizzle, esquema e migrações | [persistencia](funcionalidades/persistencia.md) |
| `shared/` | Erros padronizados, tipos comuns, logging, rastreamento (sem lógica de negócio indiscriminada) | — |

## Contratos entre módulos

Módulos conversam por contratos explícitos.

- **Autenticação:** verificar identidade, validar sessão, consultar estado de autenticação. Não expõe senhas/segredos de sessão a outros módulos sem necessidade.
- **Autorização:** recebe (usuário autenticado, ação, recurso, escopo) e devolve decisão **explícita** (concedida/negada).
- **Ferramenta:** declara id único, descrição, esquema de args, permissão necessária, política contextual, implementação, estrutura de retorno, tratamento de erros. Não confia em identidade fornecida pela IA.
- **IA:** adaptador isola a Gemini API; `chat` não depende de detalhes da API.
- **Auditoria:** registra id, tipo, resultado, contexto relevante e `trace_id`; sem senhas/tokens.

## Fluxos operacionais

### Login
1. Usuário informa credenciais → frontend envia ao backend.
2. Backend valida; se válidas, cria sessão e a entrega ao cliente (mecanismo de transporte a definir — ver pendências).
3. Evento de autenticação é registrado. Falha: recusa, sem expor segredos (e sem revelar se a conta existe).

### Solicitação autorizada
1. Usuário envia mensagem → backend identifica usuário pela sessão.
2. IA interpreta e propõe ferramenta registrada.
3. Backend valida ferramenta e argumentos.
4. Autorização avalia permissões e contexto.
5. Ferramenta executa → evento/resultado auditados → assistente responde.

### Solicitação não autorizada
Mesmo início, mas a autorização detecta falta de permissão/restrição → **execução bloqueada** → negação auditada → resposta segura ao usuário. Nenhum efeito antes da autorização.

### Revogação de sessão
Logout ou ação administrativa autorizada → estado da sessão atualizado → evento registrado → próximas requisições com essa sessão são recusadas.

### Falha no serviço de autorização
Indisponível ou incapaz de avaliar → **impede execução**. Falha técnica nunca é autorização implícita.

## Estrutura de pastas **[Sugestão]**

Ver [02-stack-e-convencoes.md](02-stack-e-convencoes.md#estrutura-de-pastas-sugestão).
