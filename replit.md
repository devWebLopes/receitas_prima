# Miolo — Custos de Alimentos

Aplicação para cadastrar insumos e receitas, calcular custos por lote e produto e planejar quantidades para produção artesanal.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Local dev (Windows / fora do Replit): copie `.env.example` → `.env`; ver `docs/README.md` › Desenvolvimento local

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/custos-alimentos/` — aplicação React para painel, receitas, insumos e planejamento de produção
- `lib/api-spec/openapi.yaml` — contrato OpenAPI e fonte para os clientes/hooks gerados
- `artifacts/api-server/src/routes/food-business.ts` — rotas de receitas, insumos e estimativas de produção
- `lib/db/src/schema/food-business.ts` — tabelas PostgreSQL do domínio alimentar
- `artifacts/custos-alimentos/src/index.css` — tokens e estilos do produto

## Architecture decisions

- Preços de pacotes são convertidos para custo por grama, mililitro ou unidade antes de calcular receitas.
- O custo das receitas é derivado dos preços atuais dos insumos.
- Planejamentos salvos guardam uma estimativa de custo como fotografia do momento, sem mudar quando os preços forem atualizados.
- A estimativa de produção escala a receita pelo rendimento até a quantidade desejada e consolida insumos repetidos.

## Product

- Cadastro e edição de preços e embalagens de insumos.
- Cadastro de receitas de pães, cucas, quiches, granola e outras categorias, com custo por lote e por unidade.
- Planejamento de múltiplas receitas com cálculo de quantidades, custos e lista consolidada de insumos.
- A receita e os preços iniciais são exemplos e devem ser substituídos pelos valores reais do produtor.

## User preferences

_Nenhuma preferência persistente informada._

## Gotchas

- Scripts de `package.json` precisam ser multiplataforma (rodam em `cmd` no Windows): nada de `export`, `sh -c`, `rm`. Use Node (`scripts/*.mjs`, `node --env-file-if-exists`).
- `pnpm-workspace.yaml` exclui binários nativos de plataformas não usadas; manter `linux-x64` e `win32-x64`.
- `.env` da raiz só é lido localmente (API via `--env-file-if-exists`, drizzle via `process.loadEnvFile`); no Replit as variáveis vêm do ambiente.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
