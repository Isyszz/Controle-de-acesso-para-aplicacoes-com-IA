# RBAC3 — papéis, hierarquia, permissões e matriz inicial

Fonte: especificação técnica final, seção 2 e 3 (restrições).

## Papéis iniciais
`employee` (funcionário) · `manager` (gerente) · `administrator` (administrador)

## Hierarquia
- `manager` **herda** as permissões operacionais básicas de `employee`.
- `administrator` é papel **separado**: **não** herda automaticamente permissões operacionais; recebe só as administrativas **explicitamente** atribuídas.
- Usuário pode ter mais de um papel, se as regras de atribuição permitirem.
- Hierarquia **não** dá acesso irrestrito a dados: políticas contextuais continuam obrigatórias.

## Permissões iniciais
| Código | Ação autorizada |
|---|---|
| `sales:read:own` | Consultar vendas do próprio escopo |
| `sales:read:team` | Consultar vendas da equipe autorizada |
| `sales:read:unit` | Consultar vendas da unidade autorizada |
| `customers:read:scoped` | Consultar clientes dentro do escopo permitido |
| `reports:read:administrative` | Consultar relatórios administrativos |
| `users:read` | Consultar usuários |
| `users:manage` | Criar, desativar ou atualizar usuários |
| `roles:assign` | Atribuir/remover papéis conforme regras administrativas |
| `audit:read` | Consultar eventos de auditoria (`GET /admin/audit-events`) · **adicionada na rodada de decisões** |

## Matriz inicial de atribuição
| Permissão | Funcionário | Gerente | Administrador |
|---|---|---|---|
| Próprias vendas | Sim | Sim (herança) | Conforme atribuição |
| Vendas da equipe | Não | Sim | Conforme atribuição |
| Vendas da unidade | Não | Conforme escopo e atribuição | Conforme atribuição |
| Clientes autorizados | Sim | Sim | Conforme atribuição |
| Relatório administrativo | Não | Não por padrão | Sim, se atribuída |
| Gerenciar usuários | Não | Não | Sim, se atribuída |
| Atribuir papéis | Não | Não | Sim, sob restrições |
| Consultar auditoria | Não | Não | Sim, se atribuída |

"Sim" = o papel **pode fornecer** a permissão; a operação ainda depende da autorização contextual. Permissões do administrador também são explícitas.

## Restrições de papéis (RBAC3)
1. Só administradores autorizados atribuem papéis.
2. Administrador **não** concede permissões que não está autorizado a administrar (ninguém se concede privilégio superior).
3. Papéis incompatíveis são rejeitados **apenas** quando a combinação for declarada proibida por regra de negócio real. **Não inventar** incompatibilidade artificial.
4. Usuário desativado não recebe sessão nem executa operações protegidas.
5. Alterações de papéis e permissões são auditadas.
