# Skill: Backend Express 5

## Propósito

Implementar e manter a API REST em `artifacts/api-server` seguindo as convenções do projeto.

## Quando usar

Ao criar/alterar rotas, middlewares ou lógica de acesso a dados no servidor.

## Estrutura

```
artifacts/api-server/src/
  index.ts        # bootstrap (porta 5000)
  app.ts          # app Express: pino-http, cors, json, mount /api
  routes/
    index.ts      # agrega os routers de domínio
    health.ts     # healthcheck
    food-business.ts  # rotas do domínio alimentar
  middlewares/
  lib/            # logger e utilitários
```

## Convenções

- Um router por recurso de domínio; registrar em `routes/index.ts` sob `/api`.
- **Validar body/params/query** com schemas de `@workspace/api-zod` antes de tocar no banco.
- Respostas e status codes conforme o `openapi.yaml` (a skill [api-contract-first](./api-contract-first.md) manda neste fluxo).
- Erros: `400` validação · `404` não encontrado · `409` conflito de negócio (ex.: excluir insumo em uso). Corpo JSON consistente, sem stack trace.
- Handlers `async`: deixar rejeições propagarem (Express 5 trata); não engolir exceções com `try/catch` vazio.
- Logs via `pino` (já configurado em `app.ts`); não usar `console.log`.
- Acesso a dados somente via `@workspace/db` (Drizzle). Sem SQL cru.

## Rodar localmente

```bash
pnpm --filter @workspace/api-server run dev   # requer DATABASE_URL
```

## Armadilhas

- Insumo vinculado a receita não pode ser excluído (FK `restrict`) — trate como `409` com mensagem amigável.
- Dinheiro/quantidades vêm do banco como `number` (numeric mode) — não reparsear strings.
- Build é bundle CJS via esbuild; evitar dependências ESM-only que quebrem o bundle.
