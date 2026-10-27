# Pendências e lacunas

> **Não há pendências bloqueantes.** Todas as antigas pendências A, B e B-novo foram decididas em [decisoes-fechadas](decisoes-fechadas.md). O agente pode implementar seguindo as Etapas 1 a 9 de [plano-implementacao](plano-implementacao.md).

## Como o agente deve agir em dúvida
- Detalhe técnico não coberto: escolher a opção **mais restritiva** em segurança, **registrar a suposição** na documentação e seguir.
- Algo que exija quebrar uma [regra inegociável](00-regras-inegociaveis.md): **parar e perguntar**.
- Suposição técnica **não** vira regra de negócio (permissão, papel, política) sem aprovação.

## Pontos de atenção permanentes
- `auth_providers`, `external_identities`, `authorization_policies` e `user_scopes` **não** devem ser criadas (só as 9 tabelas aprovadas).
- Papéis: `employee`, `manager`, `administrator`. Catálogo de 9 permissões (as 8 iniciais + `audit:read`).
- LangChain.js: o *agent loop* **nunca** executa ferramenta direto; sempre pelo executor protegido.
- `clients` (sistemas) ≠ cliente final de `get_customer`.
- Nomes das tabelas aprovadas prevalecem sobre qualquer nome de referência (ex.: `user_tokens`, não `sessions`).
- Verificações a cargo do agente: ver [decisoes-fechadas](decisoes-fechadas.md) §8.
