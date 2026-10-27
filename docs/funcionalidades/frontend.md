# Funcionalidade: Interface Web (Login e Chat)

**Local:** `frontend/` (React + Vite + TypeScript) · **Requisitos:** RF-07, RF-12, RF-16 (testes)

## O que é
A interface pela qual o funcionário se autentica e conversa com o assistente.

## O que faz
- Tela de **login**.
- Tela de **chat** (enviar mensagem, ver resposta).
- Mostra erros e mensagens de **acesso negado** de forma amigável.
- Valida dados de interface quando aplicável.
- Trata sessão expirada/inválida (ex.: voltar ao login).

## Como faz
- Comunica-se com o backend por HTTP (ver [api-endpoints](../api-endpoints.md)).
- Gerencia estado da UI (conversa, usuário logado, carregando, erro).
- Respeita o mecanismo de sessão definido no backend (cookie/header — ver [pendências](../pendencias-e-lacunas.md)). Se cookies: configurar CORS/origem permitida e CSRF conforme o backend.
- **Nunca** envia `user_id` como fonte de identidade; usa `GET /auth/me` para saber quem está logado.

## Para que serve
Tornar o sistema demonstrável: permite mostrar acesso permitido, acesso negado e rastreabilidade.

## Onde se encaixa
Camada superior do diagrama; só fala com o backend. **Não é fronteira de segurança** — esconder um botão não substitui autorização no servidor.

## Regras e restrições
- Não expor segredos nem a chave da Gemini API (ela só existe no backend).
- Não exibir detalhes internos de erro/política.
- Mensagens ao usuário em pt-BR.

## Critérios de aceitação
Usuário autentica, conversa, vê resultados e erros; logout funciona e a UI reage a sessão revogada.

## Testes mínimos (Vitest)
Componentes de login e chat · estados (carregando/erro/negado) · chamada à API mockada · tratamento de 401/403.
> Sem Playwright/E2E nesta versão.
