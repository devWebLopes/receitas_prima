# Skill: pnpm Workspace

## Propósito

Operar o monorepo com segurança: instalar dependências no lugar certo, rodar scripts por pacote e respeitar as defesas de supply chain.

## Quando usar

Sempre que for instalar dependência, rodar script de build/typecheck/dev, ou criar um pacote novo.

## Instruções

- **Somente pnpm.** O `preinstall` aborta `npm`/`yarn`.
- Rodar script de um pacote: `pnpm --filter <nome-do-pacote> run <script>`.
  - Ex.: `pnpm --filter @workspace/api-server run dev`
- Adicionar dependência a um pacote: `pnpm --filter <nome-do-pacote> add <dep>`.
- Dependência compartilhada por vários pacotes: declare a versão no `catalog` do `pnpm-workspace.yaml` e use `"<dep>": "catalog:"` no pacote.
- Typecheck geral: `pnpm run typecheck` (roda `tsc --build` nas libs e o typecheck de cada artifact).
- Build geral: `pnpm run build`.

## Estrutura de pacotes

- `artifacts/*` — aplicações (`api-server`, `custos-alimentos`, `mockup-sandbox`)
- `lib/*` — bibliotecas (`db`, `api-spec`, `api-zod`, `api-client-react`)
- `scripts` — automação do workspace
- Nomes de import: `@workspace/<nome>`.

## Regras rígidas

1. **Nunca desabilitar `minimumReleaseAge: 1440`** — defesa contra supply chain attacks.
2. Não adicionar entradas a `minimumReleaseAgeExclude` sem justificativa explícita e temporária.
3. Não mexer nos `overrides` de plataforma (esbuild/lightningcss/rollup/oxide) — excluem plataformas não usadas; só `linux-x64` (Replit) e `win32-x64` (dev local no Windows, ver `plans/plan-002-compatibilidade-windows.md`) são mantidas. Os overrides de versão existem para correções de CVE.
4. Pacote novo precisa de `package.json` com `name` no padrão `@workspace/<nome>` e `tsconfig.json` estendendo `tsconfig.base.json`.

## Armadilhas

- Node 24 é o alvo; não usar APIs de runtimes antigos como referência.
- `autoInstallPeers: false` — peer dependencies precisam ser declaradas explicitamente.
