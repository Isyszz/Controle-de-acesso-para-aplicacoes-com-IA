# API e endpoints

Organização inicial proposta; caminhos definitivos devem permanecer consistentes com os contratos implementados.

| Método | Endpoint | Responsabilidade | Auth | Autorização |
|---|---|---|---|---|
| POST | `/auth/login` | Autenticar e criar sessão | pública | — |
| POST | `/auth/logout` | Encerrar sessão atual | sessão | — |
| POST | `/auth/refresh` | Renovação controlada da sessão (ver [decisoes-fechadas](decisoes-fechadas.md) §6.4) | sessão | — |
| GET | `/auth/me` | Identidade autenticada | sessão | — |
| GET | `/chat/tools` | Ferramentas que podem ser apresentadas ao usuário, quando aplicável | sessão | filtra por permissão |
| POST | `/chat/messages` | Enviar mensagem ao assistente | sessão | por ferramenta, no executor |
| GET | `/admin/users` | Consultar usuários | sessão | permissão admin |
| PATCH | `/admin/users/:id/status` | Alterar estado da conta | sessão | permissão admin |
| PUT | `/admin/users/:id/roles` | Gerenciar papéis | sessão | permissão admin |
| GET | `/admin/audit-events` | Consultar auditoria | sessão | permissão admin |

`/auth/login`, `/auth/refresh` e `/auth/me` devolvem o token CSRF (ver [decisoes-fechadas](decisoes-fechadas.md) §6.2). `GET /admin/audit-events` exige `audit:read`; `/admin/users*` exigem `users:read`/`users:manage`/`roles:assign`.

(As colunas Auth/Autorização são um resumo derivado do documento.) Endpoint para **listar ferramentas** só deve existir se necessário; estar no catálogo não significa que o usuário possa executá-la.

## Respostas de erro

Usar códigos HTTP coerentes + **códigos de erro estáveis**, sem revelar detalhes internos de política nem segredos.

| HTTP | Uso |
|---|---|
| 400 Bad Request | Argumentos inválidos |
| 401 Unauthorized | Sessão inválida ou autenticação necessária |
| 403 Forbidden | Operação não autorizada |
| 404 Not Found | Recurso inexistente **ou não revelável** |
| 500 Internal Server Error | Falha interna não tratada |

Códigos e mensagens finais serão padronizados na implementação.

## Formato de erro **[Sugestão]**
```json
{ "error": { "code": "AUTHZ_DENIED", "message": "Você não tem permissão para esta operação.", "traceId": "..." } }
```
- `code` estável e em maiúsculas; `message` segura em pt-BR; `traceId` ajuda suporte (não é credencial).
- Em login inválido, mensagem genérica idêntica para "usuário inexistente" e "senha errada".

## Códigos internos estáveis (especificação técnica final)
| Situação | HTTP | Código interno |
|---|---|---|
| Login inválido | 401 | `AUTH_INVALID_CREDENTIALS` |
| Sessão ausente, expirada ou revogada | 401 | `AUTH_SESSION_INVALID` |
| Usuário sem permissão | 403 | `AUTHZ_DENIED` |
| Recurso fora do escopo | 403 ou 404 | `RESOURCE_SCOPE_DENIED` |
| Argumentos inválidos | 400 | `VALIDATION_ERROR` |
| Ferramenta inexistente | 400 | `TOOL_NOT_FOUND` |
| Falha inesperada | 500 | `INTERNAL_ERROR` |

- Em recursos sensíveis, **404** pode ser preferível a 403 (não confirma existência); manter consistência em todo o projeto.
- Respostas incluem o `trace_id`. Mensagens ao usuário não revelam detalhes da autorização.
- `/chat/tools`: listar existe no contrato, mas estar listada não significa estar autorizado a executar.
