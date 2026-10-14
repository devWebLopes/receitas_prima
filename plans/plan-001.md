# Plan 001 — Inicialização da estrutura base

> **Status**: ✅ Concluído em 2026-10-06
> **Agente responsável**: Orquestrador
> **Skills envolvidas**: `pnpm-workspace`, `dominio-custos` (leitura de contexto)

## Contexto

O projeto Miolo (Custos de Alimentos) não tinha estrutura de governança para trabalho com agentes de IA. O prompt `docs/prompt_longo_estruturado.txt` definiu 5 etapas para criar essa base: documentação, skills, agentes, planejamento e arquivo mestre.

## Objetivo

Criar a estrutura `docs/`, `skills/`, `agents/`, `plans/` e o arquivo mestre `AGENTS.md`, de forma que qualquer IA (ou pessoa) consiga entender o projeto, seguir seus padrões e executar tarefas futuras com agentes especializados.

## Passos executados

1. **Levantamento do contexto** — leitura de `replit.md`, `package.json`, `pnpm-workspace.yaml`, estrutura de `artifacts/` e `lib/`, schema Drizzle e `App.tsx` para extrair stack, arquitetura e regras de negócio reais (sem inventar).
2. **docs/** — criados:
   - `docs/README.md` — índice principal, arquitetura em uma página, comandos e regras de ouro;
   - `docs/arquitetura.md` — pacotes, dependências entre eles, decisões arquiteturais;
   - `docs/padroes-de-codigo.md` — convenções TS/React/Express/Drizzle;
   - `docs/dominio-custos-alimentos.md` — entidades, fórmulas e invariantes do negócio;
   - `docs/fluxo-de-trabalho-ia.md` — protocolo de operação para agentes.
3. **skills/** — criados `skills/README.md` (índice) e 7 skills: `pnpm-workspace`, `api-contract-first`, `backend-express`, `database-drizzle`, `frontend-react`, `dominio-custos`, `qa-verificacao`.
4. **agents/** — criados `agents/README.md` (índice + regras de acionamento) e 4 agentes: `frontend`, `backend`, `qa`, `orquestrador`, cada um com skills atribuídas e limites claros.
5. **plans/** — este arquivo, como primeiro plano e modelo para os próximos.
6. **AGENTS.md** — arquivo mestre na raiz com contexto, mapa da estrutura e regras rígidas.

## Validação

- [x] Todos os arquivos criados e interligados por links relativos.
- [x] Nenhum conteúdo contradiz `replit.md`, `pnpm-workspace.yaml` ou o código existente.
- [x] Estrutura final corresponde às 5 etapas do prompt.
- [x] Nenhum código-fonte foi alterado (tarefa apenas documental) — typecheck não aplicável.

## Entrega

Estrutura base pronta para uso. Próximas tarefas devem abrir `plans/plan-002-<slug>.md` seguindo este modelo e acionando o agente adequado conforme `agents/README.md`.

## Template para próximos planos

```markdown
# Plan NNN — <título>

> **Status**: 🔄 Em andamento | ✅ Concluído
> **Agente responsável**: <frontend|backend|qa|orquestrador>
> **Skills envolvidas**: <lista>

## Contexto
## Objetivo
## Passos
## Validação
## Entrega
```
