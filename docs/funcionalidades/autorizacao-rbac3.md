# Funcionalidade: Autorização (RBAC3 + Políticas Contextuais)

**Módulo:** `features/authorization/` · **Requisitos:** RF-04, RF-05, RF-06, RF-10 · RNF-01, RNF-02, RNF-06

## O que é
O "juiz" central do sistema: decide se um usuário autenticado **pode** executar uma ação sobre um recurso, combinando:
- **RBAC3**: papéis + permissões + **hierarquia** de papéis + **restrições**;
- **Políticas contextuais**: consideram recurso, escopo e condições da operação.

## O que faz
- Associa usuários a papéis e papéis a permissões (conforme a **matriz aprovada**).
- Calcula as **permissões efetivas** (com herança e restrições).
- Avalia políticas contextuais (ex.: "só os próprios registros", escopo de equipe).
- Devolve decisão **explícita**: concedida ou negada (com motivo padronizado para auditoria).

## Como faz
A decisão avalia, conforme aplicável:
1. O usuário existe e está ativo?
2. A sessão é válida?
3. A operação exige qual permissão?
4. O usuário tem essa permissão efetiva?
5. O recurso está dentro do escopo permitido?
6. Há restrição contextual aplicável?
7. Dá para conceder sem violar as regras?

**Se faltar informação para decidir → negar.** Um único serviço centraliza a decisão para que nenhuma ferramenta implemente regra própria divergente.

Contrato: entrada = (usuário autenticado, ação, recurso, escopo); saída = decisão explícita.

## Para que serve
Garantir privilégio mínimo: ter uma permissão genérica **não** dá acesso a todos os registros, e ser admin **não** dá todas as permissões de negócio.

## Onde se encaixa
Chamado pelo **executor de ferramentas** imediatamente antes de executar (e por guards em endpoints admin). Consome dados de papéis/permissões/políticas da persistência; emite eventos para a auditoria.

## Regras e restrições
- Aplicada **no backend**, logo antes da execução (guards não bastam).
- Indisponibilidade/erro do serviço → **negar**.
- Alterações de papéis/permissões valem nas verificações subsequentes.
- Não inferir permissões por nome de papel; seguir a matriz.
- Matriz, papéis e permissões: [rbac3-matriz](../referencias/rbac3-matriz.md). Políticas P-01..P-07: [politicas-contextuais](../referencias/politicas-contextuais.md). Não invente papéis/permissões além desses.

## Eventos de auditoria
Toda decisão (concedida/negada) · alterações de papéis e permissões · falhas do mecanismo.

## Critérios de aceitação
- Cenários da matriz produzem as decisões esperadas.
- Usuário não consulta registros de outro escopo só trocando ids/argumentos.
- Falha na autorização impede execução.

## Testes mínimos (Vitest)
Permissão direta · herança hierárquica · restrições RBAC3 · escopo próprio vs. alheio · usuário inativo · sessão inválida · informação ausente → negado · erro interno → negado · mudança de permissão refletida.

## Esboço de contrato **[Sugestão]**
```ts
type AuthzRequest  = { userId: string; action: string; resource: { type: string; id?: string }; scope?: Record<string, unknown>; traceId: string };
type AuthzDecision = { allowed: boolean; reasonCode: string }; // reasonCode padronizado, sem detalhes internos ao usuário
```
