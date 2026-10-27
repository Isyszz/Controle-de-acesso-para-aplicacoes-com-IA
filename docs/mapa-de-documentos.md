# Mapa de documentos do Projeto C (contexto para o agente)

> **Arquivo principal de contexto para o agente de código.** Leia este arquivo primeiro; depois siga os links conforme a tarefa.
> (Se sua ferramenta espera um nome específico, este arquivo pode ser copiado/renomeado para `CLAUDE.md` ou `AGENTS.md` na raiz do repositório.)

- **Idioma do projeto:** português brasileiro (código pode ser em inglês; textos de UI, mensagens e docs em pt-BR)
- **Versão da especificação:** 1.0 (revisão: organização `features/ infrastructure/ shared/` e LangChain.js definido)
- **Status:** planejamento concluído, **sem pendências bloqueantes**; implementação autorizada a iniciar (leia [docs/decisoes-fechadas.md](decisoes-fechadas.md) antes de codar)
- **Natureza:** protótipo funcional, em ambiente controlado (não é produção)

---

## 1. O que é

Um protótipo de **assistente de IA corporativo com chat**, no qual funcionários fazem pedidos em linguagem natural e a IA pode **propor o uso de ferramentas** (ex.: consultar vendas, consultar clientes, executar uma operação administrativa). O diferencial do projeto não é a IA em si, e sim **os controles de segurança em volta dela**: autenticação, autorização, execução protegida de ferramentas e auditoria.

## 2. O que faz

- Autentica funcionários (login gerenciado pelo backend) e mantém sessões revogáveis.
- Recebe mensagens de chat, envia ao Gemini e recebe dele, quando cabível, uma **proposta** de chamada de ferramenta.
- Valida a proposta (ferramenta registrada? argumentos válidos?) e **autoriza no backend** (RBAC3 + políticas contextuais) antes de executar.
- Executa somente ferramentas registradas e permitidas; bloqueia o resto com resposta segura.
- Registra decisões e eventos em auditoria, correlacionados por `trace_id`.

## 3. Como faz

1. **Frontend** (React + Vite) envia a mensagem à API. O frontend **não é fronteira de segurança**.
2. **Backend** (NestJS, monólito modular) identifica o usuário **pela sessão**, nunca por dados vindos do cliente ou da IA.
3. **Módulo de IA** (adaptador interno que usa **LangChain.js** para orquestrar o Gemini) devolve uma proposta estruturada.
4. **Executor de ferramentas** valida o contrato (Zod) e consulta o **serviço central de autorização** imediatamente antes de executar.
5. **Auditoria** grava o que aconteceu (permitido, negado, falha) com `trace_id`.
6. Dados em **PostgreSQL via Drizzle ORM**; testes somente com **Vitest**.

## 4. Problema que resolve

Assistentes de IA conectados a ferramentas podem receber pedidos que envolvem dados restritos ou ações administrativas. Se a IA decide sozinha o que executar, um pedido bem formulado (ou malicioso) pode ultrapassar as permissões do usuário. O projeto garante que **a capacidade da IA de interpretar e propor ações não elimine os controles de segurança**: ex.: um funcionário pode ver as próprias vendas, mas não relatórios administrativos ou dados de outras equipes, **independentemente de como o pedido foi escrito**.

## 5. Princípio central (resumo das regras inegociáveis)

> **A IA propõe. O backend decide.**

Detalhes completos em [docs/00-regras-inegociaveis.md](00-regras-inegociaveis.md).

## 6. Stack resumida

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | NestJS + TypeScript (monólito modular) |
| Banco | PostgreSQL + Drizzle ORM |
| Validação | Zod |
| IA | Gemini API (Google), via adaptador em `features/ai/`; **LangChain.js** como camada de integração/orquestração, só dentro desse módulo |
| Testes | **Somente Vitest** (sem Jest, sem Playwright) |
| Senhas | Argon2id (biblioteca a aprovar; sugestão: `argon2`) |
| Sessão | Opaca, cookie `HttpOnly`; 30 min inatividade / 8 h absoluto |
| Ambiente | `.env` + `.env.example`; Docker Compose opcional |

Detalhes: [docs/02-stack-e-convencoes.md](02-stack-e-convencoes.md).

---

## 7. Mapa de documentos

### Leitura obrigatória antes de codar
| Documento | Para quê |
|---|---|
| [docs/00-regras-inegociaveis.md](00-regras-inegociaveis.md) | Regras que nunca podem ser violadas e checklist anti-erro do agente |
| [docs/01-arquitetura.md](01-arquitetura.md) | Estilo arquitetural, diagrama, módulos, fronteiras e fluxos operacionais |
| [docs/02-stack-e-convencoes.md](02-stack-e-convencoes.md) | Tecnologias, responsabilidades por camada, estrutura de pastas |
| [docs/referencias/rbac3-matriz.md](referencias/rbac3-matriz.md) | Papéis `employee`/`manager`/`administrator`, permissões e matriz |
| [docs/referencias/politicas-contextuais.md](referencias/politicas-contextuais.md) | Políticas P-01 a P-07 |
| [docs/referencias/sessoes-credenciais.md](referencias/sessoes-credenciais.md) | Sessões, cookies, expiração, Argon2id e biblioteca |
| [docs/referencias/ferramentas-catalogo.md](referencias/ferramentas-catalogo.md) | As 4 ferramentas e o contrato |
| [docs/referencias/modelagem-dados.md](referencias/modelagem-dados.md) | As 9 tabelas e requisitos de dados |
| [docs/decisoes-fechadas.md](decisoes-fechadas.md) | **Decisões já tomadas** (seeds, contratos das ferramentas, chat, CSRF, refresh, limites da IA). Leia junto com as pendências |
| [docs/pendencias-e-lacunas.md](pendencias-e-lacunas.md) | **O que NÃO está no documento original e o agente deve perguntar, não inventar** |

### Funcionalidades (uma por arquivo)
| Funcionalidade | Módulo | Documento |
|---|---|---|
| Autenticação e sessões | `features/auth/` | [auth-sessoes.md](funcionalidades/auth-sessoes.md) |
| Autorização (RBAC3 + políticas contextuais) | `features/authorization/` | [autorizacao-rbac3.md](funcionalidades/autorizacao-rbac3.md) |
| Chat | `features/chat/` | [chat.md](funcionalidades/chat.md) |
| Integração com IA (Gemini / LangChain.js) | `features/ai/` | [ia-gemini-langchain.md](funcionalidades/ia-gemini-langchain.md) |
| Ferramentas protegidas | `features/tools/` | [ferramentas-protegidas.md](funcionalidades/ferramentas-protegidas.md) |
| Auditoria e rastreabilidade (`trace_id`) | `features/audit/` + `shared/` | [auditoria-trace-id.md](funcionalidades/auditoria-trace-id.md) |
| Gestão de usuários e administração | `features/users/` | [usuarios-admin.md](funcionalidades/usuarios-admin.md) |
| Persistência (PostgreSQL + Drizzle) | `infrastructure/database/` | [persistencia.md](funcionalidades/persistencia.md) |
| Interface web (login e chat) | `frontend/` | [frontend.md](funcionalidades/frontend.md) |

### Referência de apoio ao código
| Documento | Conteúdo |
|---|---|
| [docs/api-endpoints.md](api-endpoints.md) | Endpoints previstos, contratos de erro e códigos HTTP |
| [docs/testes.md](testes.md) | Estratégia Vitest, casos de segurança obrigatórios, critério de "teste aprovado" |
| [docs/ambiente-config.md](ambiente-config.md) | Variáveis de ambiente, migrações, Docker, configuração de testes |
| [docs/plano-implementacao.md](plano-implementacao.md) | Etapas 1–9 em ordem + critérios gerais de aceitação (checklist) |
| [docs/riscos-e-decisoes.md](riscos-e-decisoes.md) | Riscos com mitigação e decisões arquiteturais com justificativa |
| [docs/escopo.md](escopo.md) | O que está dentro e fora do escopo; atores |
| [docs/glossario.md](glossario.md) | Termos do domínio |

## 8. Ordem de leitura sugerida por tipo de tarefa

| Vou implementar... | Ler, nesta ordem |
|---|---|
| Qualquer coisa | README → regras inegociáveis → arquitetura → pendências |
| Login / sessão | auth-sessoes → persistencia → auditoria → testes |
| Permissões | autorizacao-rbac3 → referencias/rbac3-matriz → referencias/politicas-contextuais → persistencia |
| Uma nova ferramenta | ferramentas-protegidas → autorizacao-rbac3 → auditoria |
| Chat / IA | chat → ia-gemini-langchain → ferramentas-protegidas |
| Telas | frontend → api-endpoints |
| Testes | testes → o doc da funcionalidade testada |

## 9. Fonte original

Este conjunto de arquivos foi extraído de *Projeto C — Documento de Especificação de Requisitos e Arquitetura de Software* (v1.0, seção "Integração com IA usando LangChain.js" e organização `features/`, `infrastructure/`, `shared/`). Em caso de conflito entre estes arquivos e o documento original, o original prevalece; sinalize a divergência ao responsável.

Itens marcados como **[Sugestão]** nestes arquivos **não** vêm do documento original: foram adicionados para facilitar a implementação e podem ser ajustados.
