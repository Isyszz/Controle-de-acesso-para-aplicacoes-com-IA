# Estratégia de testes

**Único framework: Vitest** (frontend e backend). **Sem Jest. Sem Playwright.** Requisito RF-16, RNF-09.

## Tipos

### Unitários
Validação de credenciais · criar/revogar sessões · avaliação de permissões · políticas contextuais · herança e restrições RBAC3 · validação de args de ferramentas · bloqueio de ferramenta não registrada · tratamento de erros · registro de auditoria · componentes/funções do frontend.

### Integração
Autenticação com persistência · consultas via Drizzle · autorização com dados persistidos · execução autorizada · bloqueio de não autorizada · registro/consulta de auditoria · revogação de sessão · falhas em dependências.

**Banco nos testes:** instância **isolada e controlada** (sem dados reais, sem compartilhar com dev).

## Casos de segurança obrigatórios
1. Autenticado **com** permissão executa ferramenta permitida.
2. Autenticado **sem** permissão é bloqueado.
3. Não autenticado não executa ferramentas protegidas.
4. Sessão revogada não autoriza novas operações.
5. Argumentos inválidos impedem execução.
6. Ferramenta inexistente não executa.
7. Alterar identificadores não dá acesso fora do escopo.
8. Falha na autorização impede execução.
9. Negação gera o registro de auditoria esperado.
10. `trace_id` correlaciona os eventos.
11. Alteração de permissões vale nas verificações seguintes.
12. Logs não expõem senhas nem segredos de sessão.

## Critério de "teste aprovado"
Um cenário só passa quando uma **asserção automatizada** verifica o comportamento esperado. **Não basta a aplicação responder sem erro**: é preciso comprovar que a operação proibida **não foi executada** (ex.: spy/mocks da implementação da ferramenta não chamados; nenhuma linha alterada).

## Configuração
- Configurar Vitest em cada app. No NestJS, **configurar explicitamente** (padrão do framework é Jest): resolução de módulos, testes assíncronos, preparação/limpeza de dados.
- Testes da IA usam **fake do adaptador**, não a API real **[Sugestão]**.

## Padrão de teste para bloqueio **[Sugestão]**
```ts
it('nega ferramenta sem permissão e não executa', async () => {
  const run = vi.fn();
  registry.register({ ...tool, run });
  const res = await executor.execute('vendas.relatorioAdmin', args, ctxFuncionario);
  expect(res.status).toBe('denied');
  expect(run).not.toHaveBeenCalled();           // prova que não houve efeito
  expect(await audit.find({ traceId })).toContainEqual(expect.objectContaining({ result: 'denied' }));
});
```

## Checklist de aceitação (24 itens da especificação técnica final)
**Autenticação e sessões** — [ ] login válido cria sessão · [ ] credenciais inválidas rejeitadas · [ ] sessão expirada/revogada rejeitada · [ ] logout invalida · [ ] desativar usuário invalida sessões ativas
**RBAC3 e contexto** — [ ] funcionário consulta próprias vendas · [ ] funcionário sem permissão não vê relatório administrativo · [ ] gerente só vê equipes autorizadas · [ ] cliente/unidade fora do escopo negado · [ ] combinação de papéis declarada incompatível rejeitada · [ ] permissão removida deixa de autorizar · [ ] usuário não concede a si privilégios indevidos
**Ferramentas e IA** — [ ] ferramenta permitida executa após autorização · [ ] negada não executa nem parcialmente · [ ] desconhecida rejeitada · [ ] args inválidos rejeitados pelo schema · [ ] identidade no corpo não substitui a da sessão · [ ] IA não contorna o backend
**Auditoria** — [ ] login ok/falho geram eventos · [ ] decisões permitidas e negadas registradas · [ ] eventos relacionados compartilham `trace_id` · [ ] erros com código identificável, sem segredos · [ ] desativar usuário não apaga histórico · [ ] tokens/senhas/chaves ausentes dos logs

(O item "testes de interface" usa Vitest; sem Playwright. Marcar aqui não executa o teste.)
