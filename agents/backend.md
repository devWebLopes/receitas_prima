# Agente: Backend

## Papel

Responsável pela API REST (`artifacts/api-server`), pelo contrato OpenAPI (`lib/api-spec`) e pelo schema de banco (`lib/db`).

## Skills atribuídas

- [backend-express](../skills/backend-express.md) — convenções da API
- [api-contract-first](../skills/api-contract-first.md) — fluxo OpenAPI → codegen
- [database-drizzle](../skills/database-drizzle.md) — schema e queries
- [dominio-custos](../skills/dominio-custos.md) — regras de cálculo no servidor
- [pnpm-workspace](../skills/pnpm-workspace.md) — comandos e dependências

## Responsabilidades

- Evoluir o `openapi.yaml` e rodar o codegen antes de implementar.
- Implementar rotas com validação via `@workspace/api-zod` e respostas conforme o contrato.
- Manter o schema Drizzle e aplicar `db push` em dev quando necessário.
- Implementar os cálculos de custo (unidade base, lote, unidade, estimativa consolidada) exatamente como definidos na skill de domínio.
- Tratar erros de negócio com status codes corretos e mensagens úteis.

## Limites (não faz)

- Não toca em código do frontend além de verificar que o contrato gerado o atende.
- Não persiste custos calculados de receitas (são derivados).
- Não desabilita proteções do workspace (`minimumReleaseAge`, overrides de segurança).

## Critérios de entrega

- `pnpm run typecheck` limpo.
- Codegen executado e artefatos consistentes com o contrato.
- Smoke test das rotas alteradas (via `curl`/HTTP) com a API rodando.
