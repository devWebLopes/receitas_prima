# Skill: API Contract-First (OpenAPI + Orval)

## Propósito

Garantir que frontend e backend nunca divirjam: toda mudança de API nasce no contrato OpenAPI e o código de ambos os lados é derivado dele.

## Quando usar

Ao criar/alterar/remover qualquer endpoint, campo de payload ou formato de resposta da API.

## Fluxo obrigatório (nesta ordem)

1. **Editar o contrato**: `lib/api-spec/openapi.yaml`
   - Defina path, método, `requestBody`, `responses` (incluindo erros) e schemas reutilizáveis em `components/schemas`.
   - Nomes de schema em `PascalCase` (ex.: `IngredientInput`, `ProductionEstimate`).
2. **Rodar o codegen**:
   ```bash
   pnpm --filter @workspace/api-spec run codegen
   ```
   Isso regenera:
   - `lib/api-zod` → schemas Zod (`zod/v4`) para validação no servidor;
   - `lib/api-client-react` → hooks TanStack Query (`useListRecipes`, `useCreateIngredient`...), query keys (`get*QueryKey`) e tipos TypeScript.
3. **Implementar o servidor** validando entrada com os schemas de `@workspace/api-zod`.
4. **Consumir no frontend** exclusivamente via hooks de `@workspace/api-client-react`.
5. **Verificar**: `pnpm run typecheck`.

## Regras rígidas

- **Nunca editar manualmente** nada dentro de `lib/api-zod/` ou `lib/api-client-react/` — são artefatos gerados.
- Se o código gerado parecer errado, corrija o `openapi.yaml` (ou a config do Orval) e regenere.
- Respostas de erro também fazem parte do contrato — documente-as no OpenAPI.

## Armadilhas

- Esquecer o codegen deixa front e back dessincronizados sem erro imediato — o typecheck nem sempre pega. Sempre regenere após tocar o YAML.
- O override `js-yaml: 4.3.2` existe por causa de CVE em dependência do Orval — não remover.
