# Plan 002 — Compatibilidade com desenvolvimento local no Windows

> **Status**: ✅ Concluído
> **Agente responsável**: Orquestrador (execução de infraestrutura de dev, sem mudança de API ou schema)
> **Skills envolvidas**: `pnpm-workspace`, `qa-verificacao`

## Contexto

O projeto foi gerado no Replit (Linux x64) e não rodava nativamente no Windows:

1. `preinstall` da raiz usava `sh -c '...'` — `sh` não existe no Windows.
2. `dev` da `api-server` usava `export NODE_ENV=...` — sintaxe bash.
3. `pnpm-workspace.yaml` removia (overrides `"-"`) os binários nativos `win32-x64` de esbuild, rollup, lightningcss e @tailwindcss/oxide → Vite falhava com `Cannot find module @rollup/rollup-win32-x64-msvc`.
4. `vite.config.ts` do `custos-alimentos` exigia `PORT` e `BASE_PATH` (injetados pelo Replit).
5. O frontend chama `/api/...` relativo; no Replit um proxy de caminho encaminha para a API. Localmente não havia proxy.
6. Não existia mecanismo para `DATABASE_URL`/`PORT` locais além de variáveis de ambiente do shell.
7. `lib/db/drizzle.config.ts` passava path absoluto com barras invertidas (`\`) no schema, incompatível com o glob interno do `drizzle-kit` no Windows.

## Objetivo

Permitir `pnpm install` + `pnpm --filter ... run dev` no Windows (PowerShell/cmd) **sem alterar o comportamento no Replit** e sem tocar nas proteções de segurança (`minimumReleaseAge`, overrides de versão de esbuild/js-yaml/esm-loader).

## Passos

1. `pnpm-workspace.yaml`: remover apenas os overrides de plataforma `win32-x64` (esbuild, rollup msvc, lightningcss msvc, oxide msvc). Overrides de segurança intactos.
2. `package.json` (raiz): `preinstall` passa a ser `node scripts/preinstall.mjs` (mesma lógica, multiplataforma).
3. `artifacts/api-server/package.json`: `dev` = build + `node --env-file-if-exists=../../.env ...`. `NODE_ENV=development` passa a vir do `.env` local (no Replit o efeito é equivalente: o código só diferencia `"production"`).
4. `lib/db/drizzle.config.ts`: carregar `.env` da raiz se existir (`process.loadEnvFile`), e normalizar barras do schema path (`replace(/\\/g, "/")`) para o glob do `drizzle-kit` funcionar no Windows.
5. `artifacts/custos-alimentos/vite.config.ts`: fora do Replit (`REPL_ID` ausente), usar padrões `PORT=5173`, `BASE_PATH=/` e proxy `/api → http://localhost:${API_PORT ?? 5000}`. No Replit, validações originais mantidas.
6. `.env.example` na raiz + `.env` no `.gitignore`.
7. Documentação: `replit.md`, `docs/README.md` (seção de desenvolvimento local no Windows).
8. `pnpm install` para atualizar o lockfile; `pnpm run typecheck`.

## Validação

- [x] `pnpm install` conclui no Windows (preinstall passa em 270ms).
- [x] `pnpm run typecheck` limpo em todas as libs, scripts e artefatos.
- [x] Vite do `custos-alimentos` inicia no Windows (http://localhost:5173).
- [x] Banco `miolo` provisionado no PostgreSQL 18 e `pnpm --filter @workspace/db run push` aplicado com sucesso.
- [x] API inicia com `.env` local na porta 5000 (`/api/healthz` respondendo 200 `ok`).
- [x] Proxy reverso do Vite repassando `/api/healthz` perfeitamente para a API (200 `ok`).

## Entrega

- Arquivo `.env` configurado localmente a partir de `.env.example`.
- Banco de dados PostgreSQL `miolo` criado e migrado via `drizzle-kit push`.
- API e frontend testados e rodando em background com sucesso.
