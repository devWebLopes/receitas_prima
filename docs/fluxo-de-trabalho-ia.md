# Fluxo de Trabalho com IA

Como agentes de IA devem operar neste repositório. Este documento complementa o [AGENTS.md](../AGENTS.md) da raiz.

## Antes de qualquer tarefa

1. Leia o [AGENTS.md](../AGENTS.md) da raiz.
2. Leia o guia de [arquitetura](./arquitetura.md) e os [padrões de código](./padroes-de-codigo.md).
3. Se a tarefa tocar regras de negócio, leia o [domínio](./dominio-custos-alimentos.md).
4. Consulte `agents/README.md` para identificar o agente responsável e `skills/README.md` para as skills necessárias.
5. Verifique em `plans/` se já existe um plano para a tarefa. Se não existir e a tarefa for não-trivial, crie um plano antes de codar (`plans/plan-NNN-<slug>.md`, incrementando o número).

## Durante a execução

- Siga o plano passo a passo; se desviar, atualize o plano com o motivo.
- Mudanças mínimas e cirúrgicas. Não refactorar o que não foi pedido.
- Respeite o fluxo **contract-first**: OpenAPI → codegen → servidor → frontend.
- Não edite código gerado (`lib/api-zod/`, `lib/api-client-react/`).

## Antes de entregar

- `pnpm run typecheck` limpo.
- Se alterou `openapi.yaml`: codegen rodado e front/back usando os artefatos novos.
- Se alterou schema do banco: `pnpm --filter @workspace/db run push` (dev) e domínio recalculado conferido.
- Atualize a documentação afetada (`docs/`, `skills/`, `agents/`, `replit.md`) no mesmo ciclo.
- Registre em `plans/` o status final do plano executado.

## Proibido

- Commitar, dar push ou alterar histórico git sem pedido explícito do usuário.
- Instalar dependências com `npm`/`yarn`.
- Desabilitar `minimumReleaseAge` ou contornar validações de segurança do workspace.
- Introduzir `fetch`/axios no frontend fora dos hooks gerados.
- Armazenar custos de receitas como valores fixos no banco (custos são sempre derivados).
