# Skill: Domínio de Custos de Alimentos

## Propósito

Aplicar corretamente as regras de cálculo do Miolo em qualquer código (front ou back).

## Quando usar

Sempre que a tarefa envolver preços, custos de receita, rendimento, estimativa ou planos de produção.

## Fórmulas canônicas

1. **Custo-base do insumo** (por unidade base):
   - `kg` → `packPrice / (packQuantity × 1000)` → custo por grama
   - `l` → `packPrice / (packQuantity × 1000)` → custo por ml
   - `g` | `ml` | `un` → `packPrice / packQuantity`
2. **Custo do lote** = Σ (quantidade do insumo na receita × custo-base do insumo)
3. **Custo por unidade** = custo do lote ÷ `yieldQuantity`
4. **Estimativa de produção**: para cada linha `{ recipeId, quantity }`:
   - lotes = `quantity / yieldQuantity`
   - custo da linha = lotes × custo do lote
   - consolidar insumos repetidos somando quantidades (na unidade base) e custos

## Regras de negócio inegociáveis

- Custos de receita são **sempre derivados** dos preços atuais dos insumos. Nunca persistir custo de receita.
- Plano de produção salvo é **snapshot imutável** (`jsonb`): não recalcular, não editar.
- Insumo em uso por receita **não pode ser excluído** — comunicar ao usuário em pt-BR.
- Quantidades de receita são expressas na **unidade base** do insumo (g, ml ou un), mesmo que a compra seja em kg/l.
- Dados seed (receitas e preços) são exemplos, não verdade de negócio.

## Referência

Detalhes completos e tabelas: [docs/dominio-custos-alimentos.md](../docs/dominio-custos-alimentos.md).
