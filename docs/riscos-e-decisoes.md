# Riscos e decisões arquiteturais

## Riscos e medidas preventivas

| Risco | Medida |
|---|---|
| IA solicita operação não autorizada | Autorizar no backend antes da execução |
| Usuário manipula identificadores | Derivar identidade da sessão e validar escopo do recurso |
| Sessão revogada continua válida | Verificar estado da sessão em toda requisição protegida |
| Ferramenta executa args inválidos | Validar com Zod e rejeitar incompatíveis |
| Falha no serviço de autorização | Negar execução protegida quando não for possível avaliar |
| Auditoria não permite investigar | Registrar eventos, resultados e `trace_id` de forma consistente |
| Vazamento de credenciais em logs | Redigir/excluir segredos dos registros |
| Dependência excessiva do provedor de IA | Adaptador independente de fornecedor |
| Divergência entre modelagem e implementação | Criar o schema só com as 9 tabelas aprovadas; mudanças por migração versionada |
| Testes passam sem verificar bloqueios reais | Verificar explicitamente que ferramentas negadas não foram executadas |
| Configuração incorreta do ambiente | Documentar variáveis, scripts e preparação do banco |

## Decisões registradas

| Decisão | Escolha | Justificativa |
|---|---|---|
| Frontend | React + Vite | Interface separada e desenvolvimento simplificado |
| Backend | NestJS | Organização modular e injeção de dependência |
| Linguagem | TypeScript | Tipagem e consistência front/back |
| Persistência | PostgreSQL | Relacional para dados estruturados e relacionamentos |
| ORM | Drizzle ORM | Esquema tipado, consultas e migrações |
| Validação | Zod | Validação de args e estruturas |
| Testes | Somente Vitest | Framework único para unitários e integração |
| Arquitetura | Monólito modular | Separação de responsabilidades sem microserviços |
| Organização | `features/`, `infrastructure/`, `shared/` | Separa funcionalidades, infraestrutura e compartilhados |
| Autenticação | Login gerenciado pelo backend | Controle centralizado de identidade e sessões |
| Sessões | Opacas e revogáveis | Controle do servidor sem embutir permissões no identificador |
| Autorização | RBAC3 + políticas contextuais | Papéis, hierarquia, restrições e contexto |
| IA | Gemini API, orquestrada por LangChain.js dentro de `features/ai/`, atrás de adaptador interno | Define o provedor e isola a integração |
| Ferramentas | Registro e execução controlados | Impede execução arbitrária/não autorizada |
| Auditoria | Eventos correlacionados por `trace_id` | Investigação e rastreabilidade |
| Senhas | Argon2id | Hash apropriado para credenciais (biblioteca ainda a aprovar) |
| Papéis | `employee`, `manager`, `administrator`; admin não herda permissões operacionais | Privilégio mínimo |
| Políticas | `AuthorizationService` central, sem motor genérico | Simplicidade e testabilidade |
| Transporte de sessão | Cookie HttpOnly + CSRF | Revogação imediata no servidor |

## Requisitos não funcionais (resumo)
Segurança por padrão · privilégio mínimo · proteção de credenciais e sessões · validação de entradas · integridade da autorização · auditoria · manutenibilidade e testabilidade · modularidade · erros consistentes · configuração segura · privacidade/retenção · consistência de dados · ambiente reprodutível · **desempenho verificável** (medir; **não inventar metas numéricas** antes de medir).
