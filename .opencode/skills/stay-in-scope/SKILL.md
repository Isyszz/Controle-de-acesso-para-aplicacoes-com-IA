---
name: stay-in-scope
description: Mantém o agente restrito à parte pedida, com mudanças mínimas, sem refatorar nem alterar outras partes do Projeto C. Use em TODA tarefa de implementação, correção ou edição de código, antes de abrir ou alterar qualquer arquivo, principalmente quando a tarefa mencionar um único módulo, endpoint, ferramenta ou tela.
---

# Ficar dentro do escopo da tarefa

Faça **só o que foi pedido**. Código que funciona e não faz parte da tarefa não é tocado.

## Antes de editar
1. Escreva em 3 a 6 linhas: **o que vai mudar**, **em quais arquivos** e **o que NÃO vai mudar**.
2. Identifique o módulo dono da tarefa (`features/<modulo>/`, `infrastructure/database/`, `frontend/`). Edite apenas dentro dele e dos testes dele.
3. Se a tarefa parecer exigir mexer em outro módulo, **pare e pergunte** (ou use o contrato público do outro módulo, sem editá-lo).

## Durante
- **Diff mínimo.** Sem refatorar, renomear, mover arquivos, reformatar, reordenar imports ou "melhorar" código que você não precisa alterar.
- Não corrija bugs ou estilo de outras partes por conta própria. **Anote** o que viu para o relatório final e siga.
- Não altere testes existentes de outros módulos. Se um teste de outro módulo quebrar, a causa é provavelmente sua mudança: reverta ou ajuste o seu código, não o teste.
- Não apague código, arquivos ou testes que você não criou nesta tarefa.
- Não adicione funcionalidade "já que estou aqui" (recurso extra, endpoint extra, campo extra).
- Não altere arquivos de configuração, `package.json`, `tsconfig`, CI ou documentação fora do que a tarefa exige (ver `dependency-and-config-discipline`).

## Se algo fora do escopo está errado
Registre no relatório final (`finish-with-change-report`) como **observação**, sem corrigir.

## Sinal de alerta
Se o seu diff tocar mais de um módulo, ou arquivos que a tarefa não citou, volte e justifique cada um. Sem justificativa, reverta.
