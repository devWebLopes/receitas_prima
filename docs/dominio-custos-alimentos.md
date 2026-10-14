# Domínio — Custos de Alimentos

Regras de negócio do Miolo. Qualquer mudança de comportamento precisa respeitar (ou atualizar conscientemente) este documento.

## Entidades

| Entidade | Tabela | Descrição |
| --- | --- | --- |
| Insumo | `food_ingredients` | Matéria-prima comprada em pacote: nome, categoria, quantidade do pacote, unidade do pacote (`kg`, `g`, `l`, `ml`, `un`) e preço pago. |
| Receita | `food_recipes` | Produto produzido em lote: nome, categoria (Pães, Cucas, Quiches, Granola etc.), rendimento por lote e unidade de rendimento. |
| Item de receita | `food_recipe_ingredients` | Ligação receita ↔ insumo com a quantidade usada por lote (na unidade base do insumo). |
| Plano de produção | `food_production_plans` | Planejamento salvo com nome e a **estimativa completa em JSON** (snapshot). |

## Regras de cálculo

1. **Custo-base do insumo** = `packPrice / packQuantity` convertido para a unidade base:
   - `kg` → custo por **g** (dividir por 1000)
   - `l` → custo por **ml** (dividir por 1000)
   - `g`, `ml`, `un` → custo direto por unidade
2. **Custo do lote da receita** = soma de `quantidade × custo-base` de cada insumo da composição.
3. **Custo por unidade** = `custo do lote / yieldQuantity`.
4. **Custos são derivados**: mudou o preço do insumo, muda o custo de todas as receitas que o usam. Nada é cacheado em receita.

## Estimativa de produção

- Entrada: lista de `{ recipeId, quantity }` (quantidade desejada em unidades de rendimento da receita).
- O sistema **escala cada receita pelo rendimento** (`quantity / yieldQuantity` = número de lotes) e **consolida insumos repetidos** somando quantidades e custos.
- Saída: custo total, linhas por receita (lotes, custo por lote, custo total da linha) e lista consolidada de insumos (quantidade total por unidade base + custo).

## Snapshot de planos

- Salvar um plano grava a estimativa calculada **naquele momento** em `jsonb`.
- Planos salvos **não mudam** quando preços de insumos são atualizados — são histórico.

## Restrições de integridade

- Insumo ligado a uma receita **não pode ser excluído** (`onDelete: restrict`) — a UI deve comunicar isso ao usuário.
- Excluir receita remove seus itens de composição (`onDelete: cascade`).
- Um insumo **não se repete na mesma receita**: `UNIQUE (recipe_id, ingredient_id)` no banco; a API responde 400 e a UI desabilita insumos já escolhidos.
- O banco também impõe `CHECK` de positividade (quantidades, rendimento, preço ≥ 0) e unidades válidas do pacote.
- Planos salvos não são editáveis nem excluídos na versão atual.

## Dados iniciais

- Receitas e preços iniciais são **exemplos** e devem ser substituídos pelos valores reais do produtor. Não tratá-los como verdade de negócio.
