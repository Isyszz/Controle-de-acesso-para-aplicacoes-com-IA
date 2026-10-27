# Funcionalidade: Autenticação e Sessões

**Módulo:** `features/auth/` · **Requisitos:** RF-01, RF-02, RF-03 · RNF-03, RNF-04

## O que é
Mecanismo que verifica **quem é o usuário** (login) e mantém esse estado ao longo do uso (sessão), com possibilidade de expirar e revogar.

## O que faz
- Recebe credenciais, verifica e cria sessão.
- Valida a sessão em toda requisição protegida.
- Expira e revoga sessões (logout ou ação administrativa autorizada).
- Verifica o estado da conta (ativa/desativada).
- Identifica o usuário a partir da sessão validada.
- Trata sessões inválidas/expiradas.

## Como faz
- **Login gerenciado pelo backend** (sem OIDC/SSO nesta versão).
- Senhas verificadas com **Argon2id**.
- **Sessões opacas e revogáveis**: o identificador não carrega permissões; o estado vive no servidor (banco). Armazenar apenas verificador/hash do segredo da sessão, nunca o segredo em texto puro.
- Guard do NestJS valida a sessão nas rotas protegidas.
- Se usar cookies: atributos de segurança apropriados + proteção CSRF conforme o fluxo adotado.
- Credenciais inválidas → erro **sem revelar se a conta existe**.

## Para que serve
Dá base confiável de identidade para tudo o que vem depois (autorização, ferramentas, auditoria). Sem identidade confiável, não há autorização confiável.

## Onde se encaixa
Primeira camada do backend (ver diagrama em [arquitetura](../01-arquitetura.md)). Alimenta `authorization` (quem é o usuário), `chat` (de quem é a mensagem) e `audit` (ator do evento).

## Regras e restrições
- Identidade **só** da sessão; ignorar `user_id` enviado pelo cliente (RF-03).
- Sessão revogada ou expirada **não** autoriza nada (RF-02).
- Nunca logar senha nem segredo de sessão.
- Tentativas inválidas **não** criam sessão autenticada.

## Eventos de auditoria
Login ok/falho · criação, expiração e revogação de sessão · desativação de conta. Ver [auditoria](auditoria-trace-id.md).

## Endpoints
`POST /auth/login` · `POST /auth/logout` · `GET /auth/me` (ver [api-endpoints](../api-endpoints.md)).

## Critérios de aceitação
- Credenciais válidas iniciam sessão; inválidas não.
- Sessão revogada/expirada não autoriza novas operações protegidas.
- Trocar `user_id` no corpo da requisição não permite agir como outro usuário.

## Testes mínimos (Vitest)
Credencial válida/ inválida · sessão válida/inválida/expirada/revogada · logout invalida · conta desativada · alteração de `user_id` no body ignorada · logs sem segredos.

## Decisões fechadas
Ver [sessoes-credenciais](../referencias/sessoes-credenciais.md): cookie `HttpOnly`, 30 min/8 h, hash da sessão, troca de senha invalida sessões, biblioteca de hash a aprovar.

## Decisões em aberto
Política de lockout/rate limit → ver [pendências](../pendencias-e-lacunas.md).
