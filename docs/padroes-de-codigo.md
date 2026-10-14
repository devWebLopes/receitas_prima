# Padrões de Código

## Geral

- **TypeScript estrito** em tudo. Sem `any` implícito; prefira tipos derivados (`z.infer`, `$inferSelect`, tipos gerados pelo Orval).
- **pnpm apenas**. Instale dependências no pacote correto (`pnpm --filter <pkg> add <dep>`). Versões compartilhadas vão para o `catalog` do `pnpm-workspace.yaml`.
- **Prettier** formata o código; rode antes de finalizar se tocar muitos arquivos.
- Nomes de arquivos: `kebab-case` para módulos comuns; `PascalCase.tsx` para componentes React.
- Comentários e textos de UI em **pt-BR**.

## API (Express 5)

- Um arquivo de rotas por recurso de domínio em `src/routes/`; registre no `src/routes/index.ts`.
- **Valide toda entrada** com os schemas de `@workspace/api-zod` (gerados do OpenAPI). Não escreva validação manual duplicada.
- Handlers assíncronos: propague erros (Express 5 já captura rejeições de promises); responda com os status codes definidos no contrato OpenAPI.
- Erros de negócio: `400`/`404`/`409` com corpo JSON consistente; nunca vaze stack trace.
- Acesso a dados **somente** via `@workspace/db` — nada de SQL cru fora do Drizzle.

## Banco de dados (Drizzle)

- Tabelas novas em `lib/db/src/schema/`, exportadas pelo `src/schema/index.ts`.
- Prefixo de tabela por domínio (ex.: `food_*`).
- Dinheiro e quantidades: `numeric(12, 4, mode: "number")` — nunca `float`.
- Datas: `timestamp(..., { withTimezone: true })` com `defaultNow()`.
- Derive schemas de insert com `drizzle-zod` em vez de reescrever validações.
- Após alterar schema: `pnpm --filter @workspace/db run push` (apenas dev).

## Contrato OpenAPI + codegen

1. Edite `lib/api-spec/openapi.yaml` (rota, schema, respostas, exemplos).
2. Rode `pnpm --filter @workspace/api-spec run codegen`.
3. Implemente o servidor usando os schemas Zod regenerados.
4. No frontend, use **somente** os hooks de `@workspace/api-client-react`.
5. **Nunca edite manualmente** os arquivos de `lib/api-zod/` nem de `lib/api-client-react/`.

## Frontend (React)

- Componentes funcionais com hooks; estado de servidor **sempre** via TanStack Query (hooks gerados) — sem `fetch` manual.
- Após mutações, invalide as query keys afetadas usando os helpers `get*QueryKey` gerados.
- Estilo com Tailwind + tokens/classes de produto definidos em `src/index.css` (`panel`, `btn`, `eyebrow`, `pill`, `data-table`...). Não crie sistema de design paralelo.
- Moeda: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Datas: `Intl.DateTimeFormat('pt-BR', ...)`.
- Inputs numéricos pt-BR: aceitar vírgula decimal (ver helper `num` em `App.tsx`).
- Elementos interativos recebem `data-testid` estável (padrão já usado: `button-add-ingredient`, `row-recipe-<id>` etc.).
- Rotas novas: registre em `App.tsx` (wouter) e adicione item de navegação no `Shell` quando fizer sentido.

## Verificação obrigatória antes de entregar

```bash
pnpm run typecheck
```

Deve passar sem erros. Se a mudança alterou contrato ou schema, rode também o `codegen`/`push` correspondente e valide o fluxo manualmente na UI.
