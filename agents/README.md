# Agentes Especializados

Agentes de IA responsáveis por cada função no ciclo de desenvolvimento do Miolo. Cada agente é um arquivo `.md` com seu papel, skills atribuídas e limites de atuação.

## Mapa de agentes

| Agente | Papel | Skills | Quando acionar |
| --- | --- | --- | --- |
| [frontend.md](./frontend.md) | Agente Frontend | `frontend-react`, `api-contract-first`, `dominio-custos`, `pnpm-workspace` | Telas, componentes, formulários, navegação, estados de UI, consumo de hooks da API. |
| [backend.md](./backend.md) | Agente Backend | `backend-express`, `api-contract-first`, `database-drizzle`, `dominio-custos`, `pnpm-workspace` | Endpoints, validação, regras de cálculo no servidor, schema de banco. |
| [qa.md](./qa.md) | Agente de QA | `qa-verificacao`, `dominio-custos`, `pnpm-workspace` | Validação de entregas, typecheck, smoke tests, regressão dos fluxos críticos. |
| [orquestrador.md](./orquestrador.md) | Agente Orquestrador | Todas (visão de leitura) | Planejamento de tarefas (`plans/`), escolha do agente certo, coordenação de mudanças que cruzam front+back. |

## Regras de acionamento

1. **Tarefa em um único domínio** (só front ou só back): acione o agente correspondente diretamente.
2. **Tarefa fullstack** (ex.: novo endpoint + tela que o consome): o Orquestrador planeja; Backend executa contrato+servidor primeiro; Frontend depois; QA fecha o ciclo.
3. **Ordem obrigatória em mudanças de API**: OpenAPI → codegen → Backend → Frontend → QA.
4. **Dúvida de regra de negócio**: qualquer agente pode e deve consultar a skill `dominio-custos` e `docs/dominio-custos-alimentos.md` antes de decidir.
5. Nenhum agente commita ou faz push sem pedido explícito do usuário.

## Como adicionar um novo agente

1. Crie `agents/<nome>.md` com: papel, responsabilidades, skills (referência a `skills/`), limites ("não faz") e critérios de entrega.
2. Registre na tabela acima e no mapa do [AGENTS.md](../AGENTS.md).
