# Credenciais e sessões — decisões fechadas

Fonte: especificação técnica final, seção 4. Complementa [auth-sessoes](../funcionalidades/auth-sessoes.md).

Separar três conceitos: **Identidade** (quem é) · **Credencial** (prova, ex.: senha) · **Sessão** (estado autenticado). Sem token permanente com permissões embutidas; permissões são verificadas no backend.

## Ciclo de vida
Login → validar credenciais e estado da conta → criar **sessão opaca aleatória** → guardar **só o hash** do segredo no banco → cada requisição consulta sessão, usuário e permissões vigentes → válida: segue para autorização; expirada/revogada: nega.

## Decisões
| Item | Decisão |
|---|---|
| Senhas | Hash **Argon2id** por biblioteca confiável |
| Sessão | Identificador aleatório opaco, sem permissões |
| Banco | Hash/verificador, nunca o segredo original (tabela `user_tokens`) |
| Transporte | Cookie `HttpOnly`, `Secure` em HTTPS, `SameSite` adequado |
| Expiração | **30 min de inatividade** e **8 h absoluto** (valores iniciais, **configuráveis**) |
| Logout | Revoga a sessão no banco |
| Desativar usuário | Invalida todas as sessões ativas |
| Renovação | Fluxo controlado cria nova sessão; nunca renova sessão revogada |
| Troca de senha | Invalida sessões existentes por padrão |
| Auditoria | Emissão, expiração, renovação, revogação — sem o segredo |

Cookies exigem **proteção CSRF** e validação de origem; em dev local, ajustar opções de cookie (Secure/SameSite) ao ambiente.

## Biblioteca de hash — **não definida nos documentos**
Os documentos fixam apenas o algoritmo (Argon2id) e dizem "biblioteca confiável".
**[Sugestão]** Usar o pacote npm **`argon2`** (bindings do Argon2 de referência; permite escolher `argon2id`), ou `@node-rs/argon2` como alternativa. Antes de instalar: confirmar a versão atual na documentação do pacote, configurar `type: argon2id` explicitamente e usar parâmetros de custo (memória/iterações/paralelismo) recomendados pelo OWASP; parâmetros devem ser configuráveis. Registrar a escolha em [riscos-e-decisoes](../riscos-e-decisoes.md) quando aprovada.
