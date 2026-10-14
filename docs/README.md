# Documentação do Projeto — Miolo · Custos de Alimentos

> Índice principal da documentação. Toda pessoa (humana ou agente de IA) deve começar por aqui antes de modificar o código.

## Contexto

- **Projeto**: Miolo — Custos de Alimentos
- **Tipo**: WEB (fullstack — SPA React + API REST)
- **Stack**: pnpm workspaces · Node.js 24 · TypeScript 5.9 · React 19 · Express 5 · PostgreSQL + Drizzle ORM · Zod · Orval (codegen via OpenAPI) · Vite · Tailwind CSS 4
- **Descrição**: aplicação para produtores artesanais de alimentos cadastrarem insumos e receitas, calcularem custos por lote e por unidade, e planejarem a produção com lista consolidada de compras.

## Arquitetura em uma página

Monorepo pnpm com três zonas:

```
artifacts/          Aplicações executáveis
  api-server/       API REST (Express 5, porta 5000)
  custos-alimentos/ Frontend React (Vite + Tailwind + TanStack Query + wouter)
  mockup-sandbox/   Sandbox de mockups/protótipos
lib/                Bibliotecas compartilhadas
  db/               Schema Drizzle + conexão PostgreSQL (@workspace/db)
  api-spec/         Contrato OpenAPI (openapi.yaml) — fonte da verdade da API
  api-zod/          Schemas Zod gerados a partir do OpenAPI
  api-client-react/ Hooks React Query gerados a partir do OpenAPI
scripts/            Scripts de automação do workspace
```

Fluxo de dados: **Frontend → hooks gerados (`api-client-react`) → API Express → Drizzle → PostgreSQL**.
Contrato: **`lib/api-spec/openapi.yaml`** é a fonte da verdade; clientes e validações são **gerados** por Orval.

## Guias

| Arquivo | Conteúdo |
| --- | --- |
| [arquitetura.md](./arquitetura.md) | Estrutura do monorepo, pacotes, dependências entre eles e decisões arquiteturais. |
| [padroes-de-codigo.md](./padroes-de-codigo.md) | Convenções de código TypeScript, React, Express e banco de dados. |
| [dominio-custos-alimentos.md](./dominio-custos-alimentos.md) | Regras de negócio do domínio (custos, rendimento, planejamento de produção). |
| [fluxo-de-trabalho-ia.md](./fluxo-de-trabalho-ia.md) | Como agentes de IA devem operar neste repositório (leitura obrigatória). |

## Comandos essenciais

```bash
pnpm --filter @workspace/api-server run dev     # sobe a API (porta 5000)
pnpm run typecheck                              # typecheck de todos os pacotes
pnpm run build                                  # typecheck + build de todos os pacotes
pnpm --filter @workspace/api-spec run codegen   # regenera hooks e schemas a partir do OpenAPI
pnpm --filter @workspace/db run push            # aplica mudanças de schema no banco (apenas dev)
pnpm --filter @workspace/db run seed            # popula dados de exemplo (ou pnpm run db:seed)
pnpm --filter @workspace/db run clear           # apaga todos os registros do banco (ou pnpm run db:clear)
pnpm --filter @workspace/db run import-receitas # importa receitas e insumos de docs/receitas.md (ou pnpm run db:import)
```

**Variável de ambiente obrigatória**: `DATABASE_URL` (string de conexão PostgreSQL).

## Desenvolvimento local (Windows / fora do Replit)

1. Tenha Node.js 24, pnpm (`corepack enable`) e um PostgreSQL acessível.
2. Copie `.env.example` para `.env` na raiz e ajuste `DATABASE_URL` (o `.env` não é versionado).
3. `pnpm install`, `pnpm --filter @workspace/db run push` (cria tabelas) e opcionalmente `pnpm --filter @workspace/db run seed` (dados de exemplo).
4. Em um único comando na raiz:
   ```bash
   pnpm run dev
   ```
   *(No Windows você também pode executar `.\dev.ps1` ou dar duplo clique em `dev.bat`)*

   Isso sobe automaticamente a API (`http://localhost:5000`) e o Frontend Vite (`http://localhost:5173`) com logs unificados. Pressione `Ctrl+C` para parar ambos.

Fora do Replit (`REPL_ID` ausente), o Vite usa `PORT=5173` e `BASE_PATH=/` por padrão e encaminha `/api` para `http://localhost:${API_PORT:-5000}`. No Replit nada muda: as variáveis continuam vindo do ambiente.

## Publicação na Vercel (Postgres Neon)

1. Crie o banco no Neon (Vercel → Storage/Marketplace → Neon) e copie a URL **pooled** com `sslmode=require`.
2. Aplique o schema no banco de produção (uma vez, ou a cada mudança): `DATABASE_URL=<url-neon> pnpm --filter @workspace/db run push` (PowerShell: `$env:DATABASE_URL="..."; pnpm --filter @workspace/db run push`). Para histórico versionado: `generate` + `migrate`.
3. Importe o repositório na Vercel; `vercel.json` já define `installCommand` e `buildCommand` (`pnpm run build:vercel`).
4. Defina `DATABASE_URL` em Production e Preview (use branches/bancos distintos).
5. O build gera o frontend em `artifacts/custos-alimentos/dist/public` (`outputDirectory`) e empacota a API em `api/_server/app.mjs` (gitignored). A função convencional `api/index.mjs` reexporta esse bundle (Express de `artifacts/api-server/src/vercel.ts`); `rewrites` enviam `/api/*` para ela e o resto para o SPA. Local/Replit continuam usando `src/index.ts` (`listen`).

## Regras de ouro

1. **Use pnpm** — `npm`/`yarn` são bloqueados pelo `preinstall`.
2. **Contrato primeiro** — mudança de API começa no `openapi.yaml`, depois `codegen`, depois a implementação.
3. **Nunca edite código gerado** — `lib/api-zod/` e `lib/api-client-react/` são saídas do Orval.
4. **Typecheck antes de entregar** — `pnpm run typecheck` precisa passar limpo.
