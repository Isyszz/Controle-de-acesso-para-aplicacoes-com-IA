# Modelagem de dados (referência)

> Fonte: lista das **9 tabelas** da modelagem concluída (captura de tela do planejamento) + requisitos da especificação técnica final (seção 8). **O esquema físico ainda não existe: o agente o cria na Etapa 2**, com o contrato de colunas e restrições de [decisoes-fechadas](../decisoes-fechadas.md) §1. Use só estas 9 tabelas; não invente tabelas extras. Ver [pendências](../pendencias-e-lacunas.md).

## As 9 tabelas ("equilíbrio recomendado")

### Identidade e acesso
| # | Tabela | Descrição |
|---|---|---|
| 1 | `clients` | Sistemas clientes |
| 2 | `users` | Usuários vinculados a cada cliente |
| 3 | `user_credentials` | Credenciais de login (hash Argon2id, nunca senha pura) |
| 4 | `user_tokens` | Sessões, expiração e revogação (guardar só hash/verificador do segredo) |

### Permissões
| # | Tabela | Descrição |
|---|---|---|
| 5 | `permissions` | Catálogo de permissões (códigos estáveis, ex.: `sales:read:own`) |
| 6 | `roles` | Papéis |
| 7 | `user_roles` | Associação usuários ↔ papéis |
| 8 | `role_permissions` | Permissões concedidas a cada papel |

### Rastreabilidade
| # | Tabela | Descrição |
|---|---|---|
| 9 | `audit_events` | Eventos de segurança e operações |

## Estruturas adiadas para uma segunda etapa
`auth_providers`, `external_identities` (entram quando OIDC/SSO for implementado — **fora do escopo atual**) e `authorization_policies` (políticas ficam no código, em `AuthorizationService`, sem motor genérico). **Não criar essas tabelas agora.**

## Pontos que o agente deve confirmar
- Dados de negócio fictícios (vendas, clientes finais, unidades, equipes) **não aparecem na lista das 9 tabelas**, mas são necessários para as ferramentas e para validar escopo. Confirmar se serão tabelas à parte ou seed.
- `clients` (sistemas clientes) vs. "clientes" das ferramentas (`get_customer`): são conceitos diferentes; não misturar.
- Hierarquia de papéis (manager herda employee): onde fica representada (coluna em `roles`? tabela extra?) — confirmar no esquema.
- Incompatibilidade de papéis: só se existir regra real; confirmar.

## Requisitos que o modelo deve representar
| Grupo | Requisito |
|---|---|
| Usuários | Estado ativo/inativo, identidade, datas de controle |
| Credenciais | Hash/verificador, validade e revogação |
| Sessões | Criação, expiração, revogação, referência ao usuário |
| Papéis | Código único e hierarquia |
| Permissões | Códigos estáveis |
| Associações | Usuário↔papel, papel↔permissão |
| Políticas | Identificáveis e testáveis (`policy_id` na auditoria) |
| Auditoria | `trace_id`, ator, evento, decisão, motivo, horário |
| Dados fictícios | Vendas, clientes, unidades e equipes para validar escopo |

**Auditoria histórica:** papéis/permissões podem mudar; eventos antigos devem guardar informação suficiente (ex.: `permission_code`, `policy_id`, `reason_code`) para explicar decisões passadas, sem depender da configuração atual.
