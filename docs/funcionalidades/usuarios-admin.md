# Funcionalidade: Gestão de Usuários e Administração

**Módulo:** `features/users/` · **Requisitos:** RF-04 · RNF-02

## O que é
Consulta e gestão de usuários, papéis e estado de contas por **administradores com permissão explícita**.

## O que faz
- Listar/consultar usuários.
- Alterar o estado da conta (ex.: ativar/desativar).
- Gerenciar os papéis de um usuário.
- (Via auditoria) consultar eventos.
- Revogar sessões por ação administrativa autorizada.

## Como faz
Endpoints `/admin/*` protegidos por autenticação **e** pela permissão correspondente avaliada pelo serviço de autorização. Cada alteração gera evento de auditoria.

| Método | Endpoint | Função |
|---|---|---|
| GET | `/admin/users` | Consultar usuários |
| PATCH | `/admin/users/:id/status` | Alterar estado da conta |
| PUT | `/admin/users/:id/roles` | Gerenciar papéis do usuário |
| GET | `/admin/audit-events` | Consultar auditoria |

## Para que serve
Permitir administração do controle de acesso sem conceder poder irrestrito: o papel admin **não** recebe automaticamente todas as permissões de negócio.

## Onde se encaixa
Consome `authorization` e `database`; produz eventos para `audit`; interage com `auth` (revogação/ desativação).

## Regras e restrições
- Sem permissão para alterar papéis/permissões → operação bloqueada.
- Alterações valem imediatamente nas verificações subsequentes.
- Desativar conta não apaga auditoria.
- Respeitar restrições da matriz RBAC3 (ex.: conflitos entre papéis, se definidos).

## Critérios de aceitação
Usuários sem permissão não conseguem alterar papéis/permissões; alterações são auditadas e refletem nas decisões seguintes.

## Testes mínimos (Vitest)
Admin autorizado altera · funcionário comum bloqueado · mudança de papel afeta autorização seguinte · desativação impede login/uso de sessão · eventos gerados.
