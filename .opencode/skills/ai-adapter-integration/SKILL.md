---
name: ai-adapter-integration
description: Como integrar o Gemini via LangChain.js no Projeto C dentro de features/ai/, mantendo o executor protegido no controle. Use ao implementar ou alterar o adaptador de IA, o loop de chamadas de ferramenta, o prompt de sistema, o endpoint POST /chat/messages ou testes com IA mockada.
---

# Integração com IA (Gemini + LangChain.js)

Leia `docs/funcionalidades/ia-gemini-langchain.md`, `docs/funcionalidades/chat.md`, `docs/decisoes-fechadas.md` §6.1 e §6.5.

## Regras
1. Gemini e LangChain.js **só dentro de `features/ai/`**, atrás de um adaptador/contrato interno. Nada fora desse módulo importa os dois.
2. A chave `GEMINI_API_KEY` fica **só no backend**, em variável de ambiente. Modelo em `GEMINI_MODEL`, escolhido na documentação oficial com suporte a tool calling.
3. O *agent loop* **nunca** executa ferramenta direto. Cada proposta vai ao **executor protegido** (Zod → autorização → execução).
4. **Limites no backend**: no máximo `AI_MAX_ITERATIONS` (5) iterações e `AI_MAX_TOOL_CALLS` (4) chamadas por mensagem. Ao atingir: parar, não executar mais nada, auditar com `reason_code`, responder de forma segura. Sem retry automático de operação que altere dados.
5. Envie à IA **só o contexto necessário**: nunca senhas, segredos, tokens ou dados administrativos não autorizados. Resultado de ferramenta negada não leva dado protegido.
6. Resposta de `POST /chat/messages`: JSON normal, sem streaming. Identidade pela sessão, nunca por `user_id` no corpo. Não expor erros internos do provedor.
7. Histórico da conversa **em memória** na v1.
8. Trate a saída da IA como **entrada não confiável**: valide, nunca confie em permissões ou ids que ela produza.

## Testes
Mock do adaptador (nunca API real): resposta textual · proposta válida · args inválidos · ferramenta inexistente · erro/timeout do provedor · limite do loop · tentativa de contornar regras. Use `write-security-tests`.
