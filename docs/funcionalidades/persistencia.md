# Funcionalidade: Persistência (PostgreSQL + Drizzle ORM)

**Módulo:** `infrastructure/database/` · **Requisitos:** RF-15 · RNF-14, RNF-15

## O que é
A camada que guarda e recupera os dados de autenticação, autorização, auditoria e dados demonstrativos de negócio.

## O que faz
- Mantém conexão única/controlada com o PostgreSQL.
- Define o esquema tipado (Drizzle) e aplica **migrações versionadas**.
- Fornece consultas tipadas aos módulos.

## Como faz
- Esquema físico em **Drizzle ORM**, **criado pelo agente** a partir das 9 tabelas aprovadas e do contrato em [decisoes-fechadas](decisoes-fechadas.md) §1 (nomes das tabelas aprovadas, PK, FK, restrições de unicidade, índices e `timestamptz`). Após criado, relacionamentos só mudam por migração.
- Alterações estruturais só por **migração versionada e revisada**; sem mudanças manuais não documentadas.
- Evitar que cada módulo abra conexões independentes sem controle.
- Testes de integração com **banco de teste isolado** (nunca dados reais ou compartilhamento com dev).

## Entidades conceituais (do documento)
| Entidade | Responsabilidade |
|---|---|
| Usuários | Funcionários e estado das contas |
| Credenciais de usuários | Dados de autenticação, sem senha em texto puro |
| Sessões | Acessos autenticados, validade, revogação |
| Papéis | Conjuntos de responsabilidades |
| Permissões | Operações autorizadas |
| Usuário↔Papel | Papéis atribuídos |
| Papel↔Permissão | Permissões de cada papel |
| Eventos de auditoria | Decisões, operações, alterações |

> **Atualização:** a lista final tem 9 tabelas (ver [modelagem-dados](../referencias/modelagem-dados.md)); provedores, identidades externas e políticas ficam para depois.
> Esta tabela é **conceitual**. O esquema físico **não existe ainda**: o agente o cria na Etapa 2 conforme [decisoes-fechadas](decisoes-fechadas.md) §1. Dados demonstrativos de vendas/clientes ficam em fixtures (§2 do mesmo documento).

## Para que serve
Fonte de verdade e durabilidade: dados sobrevivem a reinícios; relacionamentos íntegros evitam associações inválidas entre usuários, papéis, permissões e eventos.

## Onde se encaixa
Base de todos os módulos; fica abaixo dos serviços de negócio no diagrama.

## Regras e restrições
- Preservar associações usuário/papel/permissão; sem referências a entidades inexistentes.
- Aplicar unicidades previstas.
- Sessões armazenadas conforme o mecanismo de revogação escolhido.
- Sem segredos em registros de auditoria.
- Desativar usuário ≠ apagar auditoria.

## Critérios de aceitação
Dados persistem após reinícios normais; migrações reproduzem o esquema; conexão e consultas verificadas.

## Testes mínimos (Vitest)
Migração aplica do zero · constraints (unicidade/FK) · CRUD tipado dos módulos · isolamento do banco de teste · limpeza entre testes.
