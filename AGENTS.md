# AGENTS.md — Arquivo Mestre

> **LEIA ESTE ARQUIVO ANTES DE QUALQUER TAREFA.** Ele é o ponto de entrada obrigatório para qualquer agente de IA (ou pessoa) que for trabalhar neste repositório.

## 1. Contexto e objetivos do projeto

**Miolo — Custos de Alimentos**: aplicação WEB fullstack para produtores artesanais cadastrarem insumos e receitas, calcularem custos por lote e por unidade, e planejarem a produção com lista consolidada de compras.

- **Stack**: pnpm workspaces · Node.js 24 · TypeScript 5.9 · React 19 · Express 5 · PostgreSQL + Drizzle ORM · Zod · Orval (codegen OpenAPI) · Vite · Tailwind CSS 4
- **Tipo**: WEB (SPA React + API REST Express, monorepo)
- **Idioma da UI e da documentação**: pt-BR

Objetivos permanentes:

1. Custos de receitas **sempre derivados** dos preços atuais dos insumos (nunca persistidos).
2. API **contract-first**: `lib/api-spec/openapi.yaml` é a fonte da verdade; clientes e validações são gerados (Orval).
3. Planos de produção salvos são **snapshots imutáveis**.
4. Typecheck limpo (`pnpm run typecheck`) é condição mínima de entrega.

## 2. Mapa da estrutura

```
AGENTS.md      ← VOCÊ ESTÁ AQUI. Contexto, regras e mapa do projeto.
docs/          Documentação do projeto
  README.md                  Índice: arquitetura em uma página + comandos
  arquitetura.md             Monorepo, pacotes, decisões arquiteturais
  padroes-de-codigo.md       Convenções TS / React / Express / Drizzle
  dominio-custos-alimentos.md  Regras de negócio (cálculos, invariantes)
  fluxo-de-trabalho-ia.md    Protocolo de operação para agentes
skills/        Habilidades operacionais dos agentes (índice em skills/README.md)
  pnpm-workspace.md · api-contract-first.md · backend-express.md
  database-drizzle.md · frontend-react.md · dominio-custos.md · qa-verificacao.md
agents/        Agentes especializados (índice em agents/README.md)
  frontend.md · backend.md · qa.md · orquestrador.md
plans/         Planos de tarefas (plan-NNN-<slug>.md)
  plan-001.md  Inicialização desta estrutura (inclui template para novos planos)
artifacts/     Aplicações: api-server (API) · custos-alimentos (SPA) · mockup-sandbox
lib/           Bibliotecas: db · api-spec · api-zod (gerado) · api-client-react (gerado)
replit.md      Notas de operação do ambiente Replit (run, env, gotchas)
```

## 3. Regras rígidas de funcionamento

1. **Consulta obrigatória**: antes de iniciar qualquer tarefa ou modificar código, leia este arquivo, depois `docs/README.md` e os guias relevantes em `docs/`.
2. **Escolha do agente**: identifique em `agents/README.md` qual agente executa a tarefa e aplique as skills atribuídas a ele.
3. **Planejamento**: tarefa não-trivial (multi-pacote, mudança de API ou de schema) exige plano prévio em `plans/plan-NNN-<slug>.md` — verifique o próximo número disponível.
4. **Contract-first**: mudança de API segue a ordem OpenAPI → `pnpm --filter @workspace/api-spec run codegen` → backend → frontend.
5. **Código gerado é intocável**: nunca edite `lib/api-zod/` nem `lib/api-client-react/` manualmente.
6. **pnpm apenas**: `npm`/`yarn` são bloqueados. Não desabilite `minimumReleaseAge` nem mexa nos overrides de segurança do `pnpm-workspace.yaml`.
7. **Mudanças mínimas**: faça só o que foi pedido, seguindo os padrões de `docs/padroes-de-codigo.md`. Não refactorar além do escopo.
8. **Validação**: antes de entregar, `pnpm run typecheck` limpo + checklist de `skills/qa-verificacao.md` para o que foi tocado.
9. **Documentação viva**: se a mudança afetar algo descrito em `docs/`, `skills/`, `agents/` ou `replit.md`, atualize o documento correspondente no mesmo ciclo.
10. **Git**: não commitar, dar push ou alterar histórico sem pedido explícito do usuário.

## 4. Começo rápido por tipo de tarefa

| Tarefa | Comece por |
| --- | --- |
| Nova tela ou mudança visual | `agents/frontend.md` + `skills/frontend-react.md` |
| Novo endpoint / regra no servidor | `agents/backend.md` + `skills/api-contract-first.md` |
| Mudança de schema de banco | `agents/backend.md` + `skills/database-drizzle.md` |
| Dúvida de cálculo de custo | `skills/dominio-custos.md` + `docs/dominio-custos-alimentos.md` |
| Verificação de entrega | `agents/qa.md` + `skills/qa-verificacao.md` |
| Tarefa fullstack / ambígua | `agents/orquestrador.md` → cria plano em `plans/` |
