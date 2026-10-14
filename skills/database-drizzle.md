# Skill: Banco de Dados (PostgreSQL + Drizzle)

## Propósito

Evoluir o schema e consultar o banco com segurança de tipos usando Drizzle ORM em `lib/db`.

## Quando usar

Ao criar/alterar tabelas, colunas, relações ou ao escrever queries no servidor.

## Convenções de schema

- Arquivos de schema em `lib/db/src/schema/<dominio>.ts`, exportados por `src/schema/index.ts`.
- Prefixo de tabela por domínio: `food_*` para o domínio alimentar.
- Chaves primárias: `serial("id")`.
- Dinheiro e quantidades: `numeric(..., { precision: 12, scale: 4, mode: "number" })`. **Nunca** `float`/`double`.
- Datas: `timestamp("...", { withTimezone: true }).notNull().defaultNow()`; colunas de atualização usam `.$onUpdate(() => new Date())`.
- FKs com comportamento explícito: `onDelete: "restrict"` (proteger insumo em uso) ou `"cascade"` (itens de receita).
- Derive schemas de insert com `drizzle-zod` (`createInsertSchema`) e tipos com `z.infer` / `$inferSelect`.

## Aplicar mudanças (dev)

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run seed   # popula dados de exemplo (idempotente)
pnpm --filter @workspace/db run clear           # limpa todos os registros e reinicia sequências de ID
pnpm --filter @workspace/db run import-receitas # importa receitas e insumos de docs/receitas.md
```

Requer `DATABASE_URL`. Usar `push` apenas em desenvolvimento.

## Migrations para produção

```bash
pnpm --filter @workspace/db run generate  # gera migration versionada em lib/db/drizzle
pnpm --filter @workspace/db run migrate   # aplica migrations pendentes
```

## Regras rígidas

1. Custos de receitas **não** são colunas — são sempre calculados a partir dos insumos (ver [dominio-custos](./dominio-custos.md)).
2. Planos de produção guardam a estimativa em `jsonb` como snapshot — não normalizar nem recalcular retroativamente.
3. Toda nova coluna monetária/quantitativa segue o padrão `numeric(12,4)` — sem exceções.

## Armadilhas

- `mode: "number"` entrega `number` no JS, mas `numeric` tem precisão de 4 casas — quantidades menores que 0,0001 seriam truncadas.
- Mudança de schema exige checar os três consumidores: rotas do servidor, contrato OpenAPI e telas do frontend.
