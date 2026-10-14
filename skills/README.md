# Skills do Projeto

Índice das habilidades técnicas e regras de negócio que os agentes precisam dominar para operar neste repositório. Cada skill é um arquivo `.md` com instruções operacionais objetivas.

## Mapa de skills

| Skill | Tipo | O que cobre | Quem usa |
| --- | --- | --- | --- |
| [pnpm-workspace.md](./pnpm-workspace.md) | Ferramenta | Estrutura do monorepo, catalog, comandos, regras de segurança de instalação. | Todos os agentes |
| [api-contract-first.md](./api-contract-first.md) | Técnica | Fluxo OpenAPI → Orval → Zod/hooks; como alterar a API sem quebrar o contrato. | Backend, Frontend |
| [backend-express.md](./backend-express.md) | Técnica | Convenções da API Express 5: rotas, validação, erros, logs. | Backend |
| [database-drizzle.md](./database-drizzle.md) | Técnica | Schema Drizzle, tipos numéricos/monetários, `db push`, integridade referencial. | Backend |
| [frontend-react.md](./frontend-react.md) | Técnica | React 19 + Vite + Tailwind 4 + wouter + TanStack Query; padrões de UI do Miolo. | Frontend |
| [dominio-custos.md](./dominio-custos.md) | Regra de negócio | Cálculo de custos (unidade base, lote, unidade), estimativa e snapshot de produção. | Todos os agentes |
| [qa-verificacao.md](./qa-verificacao.md) | Qualidade | Checklist de validação: typecheck, fluxos críticos, dados de teste. | QA |

## Como adicionar uma nova skill

1. Crie `skills/<nome-da-skill>.md` com: propósito, quando usar, instruções passo a passo e armadilhas conhecidas.
2. Registre-a na tabela acima.
3. Atribua-a aos agentes relevantes em `agents/`.
