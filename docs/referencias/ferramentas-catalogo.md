# Catálogo de ferramentas do protótipo

Fonte: especificação técnica final, seção 6. Todas usam **dados fictícios**. Complementa [ferramentas-protegidas](../funcionalidades/ferramentas-protegidas.md).

| Ferramenta | Permissão | Escopo |
|---|---|---|
| `get_own_sales` | `sales:read:own` | Vendas do próprio usuário |
| `get_team_sales` | `sales:read:team` | Vendas das equipes autorizadas |
| `get_customer` | `customers:read:scoped` | Cliente dentro do escopo permitido |
| `get_admin_sales_report` | `reports:read:administrative` | Relatório administrativo autorizado |

`get_team_sales` **não confia** em `team_id` arbitrário: o backend valida o escopo e restringe a consulta. Identidade sempre da sessão, nunca de `user_id` no corpo.

## Exemplo de proposta da IA
```json
{ "name": "get_own_sales", "arguments": { "period": "current_month" } }
```

## O contrato deve definir
Nome único · descrição para a IA · schema de entrada (Zod) · permissão obrigatória · política contextual · serviço executor · formato de retorno · erros padronizados · registro de auditoria.

## Fluxo seguro
IA propõe → backend identifica ferramenta permitida → Zod valida → RBAC3 + políticas autorizam? **Sim:** executa com escopo limitado e audita. **Não:** bloqueia, audita e devolve erro seguro.

Ferramenta inexistente, args inválidos ou operação não autorizada **não executam**. O retorno à IA pode dizer "não autorizado", sem expor regras internas, segredos ou dados indevidos. À IA, enviar **só o contexto necessário** (nunca senhas, segredos ou dados administrativos não autorizados).
