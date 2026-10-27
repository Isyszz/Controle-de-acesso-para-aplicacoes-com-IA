# Funcionalidade: Integração com IA (Gemini + LangChain.js)

**Módulo:** `features/ai/` · **Requisitos:** RF-11 · RNF-10, RNF-12

## O que é
A camada que conversa com o **Gemini (Google) via Gemini API**, interpreta pedidos em linguagem natural e **propõe** chamadas às ferramentas registradas. Usa **LangChain.js** como camada de integração e orquestração entre `features/ai/` e a Gemini API.

## O que faz
- Envia a conversa + descrição das ferramentas ao modelo.
- Recebe texto e/ou proposta de ferramenta (nome + argumentos).
- Converte a resposta do Gemini em **estruturas internas** neutras de fornecedor.
- Trata erros, timeouts e respostas malformadas.

## Como faz
- **Adaptador próprio** implementa um contrato interno (ex.: `AiProvider`); o resto do sistema depende só do contrato.
- Chave da Gemini API em variável de ambiente, **somente no backend**.
- Descrições/esquemas das ferramentas expostos à IA derivam do registro de ferramentas (esquemas Zod).
- Saída da IA é **sempre tratada como entrada não confiável**: passa por validação e autorização antes de qualquer execução.

### LangChain.js (stack definida)
- **Responsável por:** organização das chamadas ao modelo, definição e ciclo das ferramentas, contexto da conversa, respostas estruturadas. Args validados (ex.: Zod).
- **Não é responsável por (e não pode)**: substituir o NestJS; autenticar; autorizar; decidir acesso a dados protegidos; contornar verificações.
- Deve ficar **encapsulado em `features/ai/`** atrás do adaptador, para o resto da app ficar independente e permitir troca.
- O uso do LangChain.js **faz parte da stack definida** para a IA do protótipo. Mudar essa decisão (ex.: voltar à Gemini API direta) deve ser tratado como **alteração arquitetural**, não como alternativa de implementação.
- ⚠️ Se o LangChain executar ferramentas automaticamente (agent loop), a execução **deve** passar pelo executor protegido do backend (`features/tools/`) — nunca chamar a implementação da ferramenta direto.

## Para que serve
Dá ao assistente capacidade de entender pedidos e escolher ferramentas, mantendo o fornecedor substituível e o núcleo de segurança independente.

## Onde se encaixa
Entre `chat` e o provedor externo. Não conhece usuários, papéis ou banco. Consumido apenas por `features/chat/`.

## Regras e restrições
- A IA **não é autoridade** de autenticação ou autorização.
- Nenhuma dependência de Gemini/LangChain fora de `features/ai/`.
- Não há execução arbitrária de código pela IA nem acesso direto ao banco.
- Não logar chave nem conteúdo sensível.
- Multi-provedor **não** é requisito, mas o contrato deve permitir.

## Critérios de aceitação
A IA consegue solicitar uma ferramenta disponível, mas a proposta só é executada após validação e autorização.

## Testes mínimos (Vitest)
Usar **mock/fake do adaptador** (sem chamar API real em testes): resposta textual · proposta de ferramenta válida · proposta com args inválidos · ferramenta inexistente · erro/timeout do provedor · tentativa da IA de injetar `userId` nos args é ignorada.

## Contrato interno **[Sugestão]**
```ts
interface AiProvider {
  generate(input: { messages: ChatMessage[]; tools: ToolDescriptor[]; traceId: string }):
    Promise<{ text?: string; toolCall?: { name: string; args: unknown } }>;
}
```
