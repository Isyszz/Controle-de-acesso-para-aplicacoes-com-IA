# Políticas contextuais (PBAC)

Fonte: especificação técnica final, seção 3. Implementadas em um **`AuthorizationService` central**, com regras claras e testáveis (sem motor genérico de políticas; a tabela `authorization_policies` fica para depois).

## Elementos avaliados em cada solicitação de ferramenta
Usuário (existe, ativo, autenticado) · Sessão (válida, não expirada/revogada) · Papel e permissão · Ação (consultar/modificar/administrar) · Recurso (venda, cliente, unidade, relatório) · Escopo (pertence ao conjunto autorizado) · Estado atual (permissão ainda vigente na execução).

## Políticas do protótipo
| ID | Nome | Regra |
|---|---|---|
| P-01 | Acesso permitido | Funcionário ativo com `sales:read:own` consulta as próprias vendas |
| P-02 | Escopo dos dados | Gerente com `sales:read:team` vê só equipes **autorizadas**; a permissão não libera todas |
| P-03 | Acesso administrativo | Sem `reports:read:administrative` não há relatório administrativo, **mesmo que a IA proponha a ferramenta** |
| P-04 | Negação por padrão | Sem permissão, contexto não verificável ou conflito de regras → **negar** |
| P-05 | Conta desativada | Não inicia operações; sessões existentes são invalidadas |
| P-06 | Isolamento | Não consulta registros de outro cliente/unidade fora do escopo, mesmo alterando ids na API |
| P-07 | Permissões atualizadas | Remoções/revogações valem nas verificações seguintes, **sem cache de autorização antiga** |

Registrar o `policy_id` (P-0x) e `reason_code` na auditoria.

**Escopo no banco:** as consultas devem restringir resultados **na própria query** (filtros por escopo), não só esconder dados na UI.
