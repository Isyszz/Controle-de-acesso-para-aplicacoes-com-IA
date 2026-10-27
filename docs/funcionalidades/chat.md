# Funcionalidade: Chat

**Módulo:** `features/chat/` (+ tela em `frontend/`) · **Requisitos:** RF-07, RF-12 · RNF-11

## O que é
O ponto de entrada de linguagem natural: o funcionário escreve uma mensagem e recebe uma resposta do assistente.

## O que faz
- Recebe mensagens autenticadas.
- Coordena: identifica usuário → consulta IA → trata proposta de ferramenta → devolve resposta.
- Trata erros, respostas de IA inválidas e **solicitações negadas** com mensagem segura.

## Como faz
1. `POST /chat/messages` (rota protegida por sessão).
2. Obtém identidade da sessão e gera/propaga `trace_id`.
3. Chama `features/ai/` pelo contrato interno (nunca a API do Gemini diretamente).
4. Se a IA propuser ferramenta → entrega ao **executor** (`features/tools/`), que valida e autoriza.
5. Monta resposta controlada ao usuário (sucesso, negado ou erro seguro).

## Para que serve
Interface conversacional que une IA e ferramentas sem abrir mão do controle de acesso.

## Onde se encaixa
Orquestrador entre `auth` (identidade), `ai` (interpretação), `tools` (ação) e `audit` (rastro). Fica entre o frontend e o executor.

## Regras e restrições
- Não depender de detalhes da API do Gemini.
- Mensagem de negação **não** revela segredos, dados protegidos nem detalhes da política (RF-12).
- Erros não expõem informação interna.
- Toda negação é auditada.
- Nada na resposta da IA é confiável como identidade ou permissão.

## Critérios de aceitação
- Mensagens válidas → resposta controlada.
- Erros tratados sem vazar internos.
- Solicitações negadas → resposta segura + registro de auditoria.

## Testes mínimos (Vitest)
Mensagem sem sessão → 401 · mensagem válida sem ferramenta · com ferramenta autorizada · com ferramenta negada · erro da IA · proposta de ferramenta inexistente · `trace_id` presente nos eventos.

## Decisões em aberto
Histórico/contexto da conversa (persistido ou em memória?), tamanho máximo de mensagem, streaming ou resposta única → [pendências](../pendencias-e-lacunas.md).
