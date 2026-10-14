# Arquitetura

## Visão geral

Monorepo gerenciado com **pnpm workspaces** (`pnpm-workspace.yaml`). Pacotes vivem em `artifacts/*`, `lib/*`, `lib/integrations/*` e `scripts`. Versões de dependências compartilhadas são centralizadas no `catalog` do `pnpm-workspace.yaml`.

## Pacotes

### `artifacts/api-server` — API REST

- **Express 5** + `pino-http` (logs) + `cors`.
- Entrada: `src/index.ts`; composição do app: `src/app.ts`; rotas em `src/routes/`.
- Rotas montadas sob o prefixo `/api` (ex.: `/api/recipes`, `/api/ingredients`, `/api/production-plans`, `/api/health`).
- Build: **esbuild** gerando bundle CJS.
- Validação de entrada com schemas Zod de `@workspace/api-zod`.

### `artifacts/custos-alimentos` — Frontend

- **React 19** + **Vite 7** + **Tailwind CSS 4** (`@tailwindcss/vite`).
- Roteamento com **wouter** (`/`, `/receitas`, `/insumos`, `/producao`).
- Data fetching exclusivamente via hooks gerados em `@workspace/api-client-react` (TanStack Query).
- UI: Tailwind + tokens próprios em `src/index.css` (classes utilitárias de produto como `panel`, `btn`, `eyebrow`); componentes base em `src/components/ui/`; ícones `lucide-react`.
- Path alias `@/` → `src/`.
- Idioma da interface: **pt-BR**. Formatação monetária em BRL via `Intl.NumberFormat`.

### `lib/api-spec` — Contrato OpenAPI

- `openapi.yaml` é **a fonte da verdade** da API (rotas, payloads, respostas).
- `pnpm --filter @workspace/api-spec run codegen` roda o **Orval** e regenera:
  - `lib/api-zod` → schemas Zod para validação no servidor;
  - `lib/api-client-react` → hooks TanStack Query + tipos para o frontend.

### `lib/db` — Banco de dados

- **PostgreSQL** + **Drizzle ORM**.
- Schema do domínio em `src/schema/food-business.ts` (tabelas `food_ingredients`, `food_recipes`, `food_recipe_ingredients`, `food_production_plans`).
- Schemas de inserção derivados com `drizzle-zod` (`createInsertSchema`), usando `zod/v4`.
- Numéricos com `numeric(precision: 12, scale: 4, mode: "number")`.
- Mudanças de schema em dev: `pnpm --filter @workspace/db run push`.
- Migrations versionadas para produção: `pnpm --filter @workspace/db run generate` e `migrate`.
- Seed de dados de exemplo (artesanais): `pnpm --filter @workspace/db run seed`.
- Pool adaptativo: em produção (`NODE_ENV=production`), o pool do PostgreSQL limita o número de conexões ativas para compatibilidade com ambientes serverless (Vercel).

### Deploy e Serverless (`api/` + `vercel.json`)

- O repositório suporta execução híbrida: servidor contínuo (`artifacts/api-server/src/index.ts` com `app.listen`) para desenvolvimento local/Replit e Serverless Function (`api/index.mjs` reexportando bundle de `artifacts/api-server/src/vercel.ts`) para a Vercel.
- Build de produção Vercel: `pnpm run build:vercel` compila o frontend estático para `artifacts/custos-alimentos/dist/public` e empacota o backend Express para `api/_server/app.mjs`.
- Roteamento na Vercel via `vercel.json`: `/api/:path*` é direcionado para a Serverless Function e demais rotas servem o SPA React (`index.html`).

## Dependência entre pacotes

```
api-spec ──(codegen)──> api-zod ──> api-server ──> db
   │
   └──(codegen)──> api-client-react ──> custos-alimentos
```

Regra: **nenhum pacote em `lib/` depende de `artifacts/`**. O frontend nunca importa do servidor; a comunicação é só via HTTP conforme o contrato.

## Decisões arquiteturais (não reverter sem discussão)

1. **Contract-first**: a API é definida no OpenAPI e o código cliente/validação é gerado. Isso elimina divergência de tipos entre front e back.
2. **Custo derivado**: o custo de uma receita é sempre calculado a partir dos preços atuais dos insumos — não é armazenado como valor fixo.
3. **Snapshot de planejamento**: planos de produção salvos guardam a estimativa em `jsonb` como fotografia do momento; atualizações de preço **não** alteram planos salvos.
4. **Conversão para unidade base**: preços de pacotes são convertidos para custo por grama, mililitro ou unidade antes de calcular receitas.
5. **Segurança de supply chain**: `minimumReleaseAge: 1440` no `pnpm-workspace.yaml` não deve ser desabilitado.

## Convenções estruturais

- TypeScript estrito em todos os pacotes; `tsconfig.base.json` na raiz é a base comum.
- Imports entre pacotes usam os nomes de workspace (`@workspace/db`, `@workspace/api-zod`, `@workspace/api-client-react`, `@workspace/api-spec`).
- Novas rotas de domínio: um arquivo por recurso em `artifacts/api-server/src/routes/`.
