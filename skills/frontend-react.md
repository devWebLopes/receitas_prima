# Skill: Frontend React (Miolo)

## Propósito

Evoluir a SPA em `artifacts/custos-alimentos` mantendo consistência visual e de dados.

## Quando usar

Ao criar/alterar páginas, componentes, formulários ou integração com a API no frontend.

## Stack da UI

- React 19 + Vite 7 + Tailwind CSS 4 (plugin `@tailwindcss/vite`).
- Roteamento: **wouter** (rotas em `App.tsx`: `/`, `/receitas`, `/insumos`, `/producao`).
- Dados: **TanStack Query** via hooks gerados de `@workspace/api-client-react`. Proibido `fetch`/axios direto.
- Ícones: `lucide-react`. Alias de import: `@/` → `src/`.

## Convenções

- Idioma da interface: **pt-BR**.
- Estilo: classes utilitárias Tailwind + tokens de produto de `src/index.css` (`app-shell`, `sidebar`, `panel`, `panel-pad`, `btn`, `btn-primary`, `btn-secondary`, `icon-btn`, `eyebrow`, `page-head`, `page-title`, `metric`, `pill`, `data-table`, `empty-state`, `modal`, `skeleton`, `error-note`, `field`). Reutilize antes de inventar.
- Componentes de estrutura já existentes em `App.tsx`: `Shell`, `PageHeader`, `LoadingPanel`, `QueryError`, `EmptyState`, `Modal`, `Field`, `ErrorText`, `Metric`. Se o arquivo crescer, extraia páginas para `src/pages/` mantendo o estilo.
- Moeda: helper `fmt` (`Intl.NumberFormat` BRL). Datas: helper `dateFmt`. Entrada numérica pt-BR: helper `num` (aceita vírgula).
- Todos os elementos interativos recebem `data-testid` estável (`button-save-recipe`, `row-ingredient-<id>`, `input-plan-name`...).
- Após mutações: invalidar as query keys afetadas com os helpers `get*QueryKey()` (ex.: criar insumo invalida ingredientes, receitas **e** overview, pois custos são derivados).
- Estados obrigatórios em toda lista/painel: loading (`LoadingPanel`/`skeleton`), erro (`QueryError` com retry) e vazio (`EmptyState` com CTA).

## Rodar localmente

O frontend é servido no fluxo de dev do workspace (Vite). Para validar: subir a API (`api-server`, porta 5000) e o Vite do artifact.

## Armadilhas

- `BASE_URL` é usada como base do wouter — respeitar `import.meta.env.BASE_URL` ao criar o router.
- React 19.1.0 é versão **pinada** no catalog (exigência do expo) — não atualizar isoladamente.
