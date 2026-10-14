# Skill: QA e Verificação

## Propósito

Validar entregas antes de considerá-las prontas, com foco nos fluxos críticos do domínio.

## Quando usar

Ao final de qualquer tarefa que altere código, contrato de API ou schema de banco.

## Checklist obrigatório

1. **Typecheck**: `pnpm run typecheck` — zero erros.
2. **Contrato**: se `openapi.yaml` mudou, codegen rodado e diff dos artefatos gerados revisado.
3. **Banco**: se schema mudou, `pnpm --filter @workspace/db run push` aplicado em dev.
4. **Smoke da API**: `GET /api/health` responde; rotas tocadas respondem conforme o contrato.

## Fluxos críticos a exercitar manualmente (quando afetados)

- **Insumos**: criar, editar preço (verificar recálculo do custo das receitas que o usam), tentar excluir insumo em uso (deve falhar com mensagem amigável).
- **Receitas**: criar com múltiplos insumos, conferir custo do lote e por unidade na tabela.
- **Produção**: montar plano com 2+ receitas que compartilham insumo, conferir consolidação de quantidades; salvar plano; alterar preço de insumo e confirmar que o **plano salvo não muda**.
- **Estados de UI**: loading, erro (derrubar a API e testar retry) e lista vazia.

## Critérios de aceite

- Sem `any` novo, sem `console.log`, sem `fetch` direto no frontend.
- `data-testid` presente nos novos elementos interativos.
- Textos de UI em pt-BR; valores monetários formatados em BRL.
- Documentação afetada atualizada no mesmo ciclo.

## Armadilhas

- Typecheck verde não garante front/back sincronizados se o codegen não foi rodado — sempre verificar o diff de `lib/api-client-react` e `lib/api-zod`.
- Números com vírgula: testar entrada `1,5` nos formulários.
