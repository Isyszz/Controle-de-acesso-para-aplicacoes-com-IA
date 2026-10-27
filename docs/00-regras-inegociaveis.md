# Regras inegociáveis

> Leia antes de escrever qualquer código. Se uma tarefa parecer exigir quebrar uma destas regras, **pare e pergunte**.

Origem: requisitos RF-03, RF-10, RF-11, RNF-01 a RNF-06, RNF-10, RNF-12 e seções 9 e 10 do documento original.

## Regras de segurança

1. **A IA propõe, o backend decide.** A IA nunca concede permissão, nunca decide acesso a dados e nunca consulta o banco diretamente.
2. **Negar por padrão.** Faltou permissão, regra, contexto ou informação → **negar**.
3. **Falha técnica = negação.** Se o serviço de autorização estiver indisponível ou lançar erro, a execução é impedida (nunca "libera por omissão").
4. **Identidade vem da sessão.** Nunca de `user_id` no body, nos argumentos da ferramenta ou de algo que a IA produziu. Alterar um id na requisição não pode permitir agir como outro usuário nem sair do escopo.
5. **Autorizar imediatamente antes de executar**, dentro do executor de ferramentas. Guards do NestJS protegem endpoints, mas **não substituem** a checagem no executor.
6. **Só executa ferramenta registrada** e com argumentos válidos (Zod). Ferramenta inexistente ou argumento inválido → não executa.
7. **Validação de formato ≠ autorização.** Um argumento válido ainda pode representar uma operação proibida.
8. **Papel de admin não implica todas as permissões de negócio.** Vale a matriz aprovada.
9. **Frontend não é fronteira de segurança.**
10. **Negação não produz efeito colateral** nem acessa dado protegido antes da decisão.

## Regras de dados e segredos

11. Senhas com **Argon2id**; nunca em texto puro.
12. Segredos de sessão, senhas, tokens e chaves de API **nunca** em texto puro, nem em logs, nem em auditoria.
13. Chave da Gemini API **somente no backend**, via variável de ambiente.
14. `.env` com segredos **não é versionado**; manter `.env.example` sem valores reais.
15. Respostas de erro e de negação **não expõem** segredos, consultas internas, detalhes de política ou se uma conta existe.
16. `trace_id` serve só para correlação — **nunca** como autenticação.
17. **A modelagem é o contrato; o schema físico é você quem cria.** Criar o schema Drizzle a partir das **9 tabelas aprovadas** e do contrato de [decisoes-fechadas](decisoes-fechadas.md) §1. Não criar tabelas fora das 9 (nem as adiadas), não renomear as tabelas aprovadas e não alterar relacionamentos silenciosamente depois de criados; mudanças só por migração versionada e revisada.

## Regras de arquitetura e processo

18. **Monólito modular** NestJS. Nada de microserviços.
19. Dependência do Gemini/LangChain.js **isolada em `features/ai/`** atrás de um adaptador/contrato interno.
20. Nenhuma ferramenta oferece acesso arbitrário ao banco (usar serviços de negócio ou consultas restritas).
21. `shared/` não vira depósito de lógica de negócio.
22. **Somente Vitest.** Não adicionar Jest nem Playwright.
23. Não implementar o que está fora do escopo (ver [escopo.md](escopo.md)): OIDC/SSO, E2E, multi-provedor obrigatório, execução arbitrária de código pela IA etc.
24. Uma funcionalidade só está "pronta" quando **testes automatizados comprovam**, inclusive que operações proibidas **não** foram executadas.

## Checklist rápido antes de concluir qualquer tarefa

- [ ] A identidade usada vem da sessão validada?
- [ ] Há autorização no servidor logo antes da ação protegida?
- [ ] Caminho de erro/indisponibilidade resulta em negação?
- [ ] Argumentos validados com Zod antes de usar?
- [ ] Evento de auditoria gravado (permitido **e** negado), com `trace_id`?
- [ ] Nenhum segredo em log, auditoria ou resposta?
- [ ] Teste Vitest cobre o caso positivo, o negativo e o bloqueio real?
- [ ] Nada fora de `features/ai/` depende diretamente de Gemini/LangChain?
- [ ] Não inventei tabela, coluna, papel ou permissão que deveria vir da modelagem/matriz aprovada?

## Comportamento do agente em dúvida **[Sugestão]**

- Se a informação necessária está listada em [pendencias-e-lacunas.md](pendencias-e-lacunas.md), **pergunte** ao responsável em vez de assumir.
- Prefira a opção mais restritiva em segurança quando houver ambiguidade e registre a suposição.
