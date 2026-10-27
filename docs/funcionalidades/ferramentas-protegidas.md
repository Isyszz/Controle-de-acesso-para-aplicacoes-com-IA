# Funcionalidade: Ferramentas Protegidas

**Módulo:** `features/tools/` · **Requisitos:** RF-08, RF-09, RF-10 · RNF-05, RNF-06

## O que é
O catálogo de **operações que a IA pode propor** e o **executor** que as roda somente depois de validar e autorizar. É onde a segurança do projeto se materializa.

## O que faz
- Mantém o **registro explícito** das ferramentas disponíveis.
- Valida os argumentos (Zod) contra o contrato de cada ferramenta.
- Consulta a autorização imediatamente antes de executar.
- Executa e devolve resultado em **formato controlado**.
- Implementa as ferramentas demonstrativas.

## Como faz
Pipeline do executor:
```
executar(nomeFerramenta, argsBrutos, contexto{usuário da sessão, traceId}):
  1. ferramenta = registro.obter(nome)        → não existe? negar + auditar
  2. args = ferramenta.schema.parse(argsBrutos) → inválido? 400 + auditar, não executar
  3. decisão = authz.decidir(usuário, permissão da ferramenta, recurso, escopo)
        (erro/indisponível → NEGAR)
  4. auditar decisão (concedida ou negada)
  5. negada? → resposta segura, SEM efeitos
  6. resultado = ferramenta.executar(args, contexto)   // identidade vem do contexto, não dos args
  7. auditar resultado/falha
  8. devolver retorno estruturado
```
(pseudocódigo **[Sugestão]**; as etapas refletem os requisitos.)

### Contrato de ferramenta (obrigatório)
Cada ferramenta declara: **id único · descrição funcional · esquema de argumentos · permissão necessária · política contextual aplicável · implementação · estrutura de retorno · tratamento de erros.**

### Ferramentas a implementar (mínimo do escopo)
- Consulta demonstrativa de **vendas**.
- Consulta demonstrativa de **dados de clientes**.
- **Ao menos uma operação administrativa restrita**.
> As 4 ferramentas definidas, com permissões e escopos: [ferramentas-catalogo](../referencias/ferramentas-catalogo.md).

## Para que serve
Permitir que a IA seja útil (consultar/agir) sem poder ultrapassar a permissão do usuário nem executar nada fora do catálogo.

## Onde se encaixa
Recebe propostas vindas de `chat` (originadas em `ai`), chama `authorization`, usa serviços de negócio/`database`, e emite eventos a `audit`.

## Regras e restrições
- Ferramenta não registrada **não executa**.
- Argumento inválido **impede** a execução.
- Ferramenta **não confia** em identidade fornecida pela IA/args; usa a do contexto da sessão.
- Sem acesso arbitrário ao banco: use serviços de negócio ou consultas restritas.
- Negação **não produz efeitos** (verificar com asserção explícita nos testes).
- Existir no catálogo ≠ usuário autorizado a executar. Endpoint de listar ferramentas só se necessário.

## Eventos de auditoria
Início, conclusão ou falha de execução · negação · argumentos inválidos · ferramenta inexistente.

## Critérios de aceitação
Ferramentas autorizadas executam; não autorizadas são bloqueadas pelo backend; argumentos validados antes; falha de autorização não executa.

## Testes mínimos (Vitest)
Autorizada executa · sem permissão bloqueada (e **spy prova que a implementação não foi chamada**) · não autenticado bloqueado · inexistente não executa · args inválidos barram · troca de id fora do escopo barrada · erro do authz bloqueia.

## Como adicionar uma nova ferramenta **[Sugestão]**
1. Definir `id`, descrição, schema Zod, retorno.
2. Definir a permissão (já existente na matriz!) e a política contextual.
3. Registrar no catálogo.
4. Implementar usando serviço de negócio restrito (identidade vinda do contexto).
5. Escrever testes: autorizado, negado, args inválidos, fora de escopo.
6. Confirmar eventos de auditoria.
