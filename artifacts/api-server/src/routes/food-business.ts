import { desc, eq, inArray } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateIngredientBody,
  CreateIngredientResponse,
  CreateProductionPlanBody,
  CreateProductionPlanResponse,
  CreateRecipeBody,
  CreateRecipeResponse,
  DeleteIngredientParams,
  DeleteRecipeParams,
  EstimateProductionBody,
  EstimateProductionResponse,
  GetOverviewResponse,
  ListIngredientsResponse,
  ListProductionPlansResponse,
  ListRecipesResponse,
  UpdateIngredientBody,
  UpdateIngredientParams,
  UpdateIngredientResponse,
  UpdateRecipeBody,
  UpdateRecipeParams,
  UpdateRecipeResponse,
} from "@workspace/api-zod";
import {
  db,
  ingredientsTable,
  productionPlansTable,
  recipeIngredientsTable,
  recipesTable,
} from "@workspace/db";

const router: IRouter = Router();
const packUnits = ["kg", "g", "l", "ml", "un"] as const;

function baseUnitForPack(unit: string): "g" | "ml" | "un" {
  if (unit === "kg" || unit === "g") return "g";
  if (unit === "l" || unit === "ml") return "ml";
  return "un";
}

function basePackQuantity(quantity: number, unit: string): number {
  return unit === "kg" || unit === "l" ? quantity * 1000 : quantity;
}

function presentIngredient(ingredient: typeof ingredientsTable.$inferSelect) {
  const canonicalQuantity = basePackQuantity(ingredient.packQuantity, ingredient.packUnit);
  return {
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    packQuantity: ingredient.packQuantity,
    packUnit: ingredient.packUnit as (typeof packUnits)[number],
    packPrice: ingredient.packPrice,
    baseUnit: baseUnitForPack(ingredient.packUnit),
    baseUnitCost: canonicalQuantity > 0 ? ingredient.packPrice / canonicalQuantity : 0,
  };
}

function hasDuplicateIngredients(items: Array<{ ingredientId: number }>): boolean {
  return new Set(items.map((item) => item.ingredientId)).size !== items.length;
}

const duplicateIngredientError = "Um insumo não pode aparecer mais de uma vez na mesma receita.";

async function ingredientIdsExist(ids: number[]): Promise<boolean> {
  if (!ids.length) return false;
  const uniqueIds = [...new Set(ids)];
  const found = await db
    .select({ id: ingredientsTable.id })
    .from(ingredientsTable)
    .where(inArray(ingredientsTable.id, uniqueIds));
  return found.length === uniqueIds.length;
}

async function listRecipeData() {
  const rows = await db
    .select({
      id: recipesTable.id,
      name: recipesTable.name,
      category: recipesTable.category,
      yieldQuantity: recipesTable.yieldQuantity,
      yieldUnit: recipesTable.yieldUnit,
      updatedAt: recipesTable.updatedAt,
      ingredientId: ingredientsTable.id,
      ingredientName: ingredientsTable.name,
      packQuantity: ingredientsTable.packQuantity,
      packUnit: ingredientsTable.packUnit,
      packPrice: ingredientsTable.packPrice,
      quantity: recipeIngredientsTable.quantity,
    })
    .from(recipesTable)
    .leftJoin(recipeIngredientsTable, eq(recipeIngredientsTable.recipeId, recipesTable.id))
    .leftJoin(ingredientsTable, eq(recipeIngredientsTable.ingredientId, ingredientsTable.id))
    .orderBy(desc(recipesTable.updatedAt));

  const grouped = new Map<number, {
    id: number;
    name: string;
    category: string;
    yieldQuantity: number;
    yieldUnit: string;
    updatedAt: Date;
    ingredients: Array<{
      ingredientId: number;
      name: string;
      quantity: number;
      unit: "g" | "ml" | "un";
      unitCost: number;
      totalCost: number;
    }>;
    batchCost: number;
    unitCost: number;
  }>();

  for (const row of rows) {
    let recipe = grouped.get(row.id);
    if (!recipe) {
      recipe = {
        id: row.id,
        name: row.name,
        category: row.category,
        yieldQuantity: row.yieldQuantity,
        yieldUnit: row.yieldUnit,
        updatedAt: row.updatedAt,
        ingredients: [],
        batchCost: 0,
        unitCost: 0,
      };
      grouped.set(row.id, recipe);
    }

    if (
      row.ingredientId !== null &&
      row.ingredientName !== null &&
      row.quantity !== null &&
      row.packUnit !== null &&
      row.packQuantity !== null &&
      row.packPrice !== null
    ) {
      const unit = baseUnitForPack(row.packUnit);
      const quantity = row.quantity;
      const unitCost = row.packPrice / basePackQuantity(row.packQuantity, row.packUnit);
      const totalCost = quantity * unitCost;
      recipe.ingredients.push({
        ingredientId: row.ingredientId,
        name: row.ingredientName,
        quantity,
        unit,
        unitCost,
        totalCost,
      });
      recipe.batchCost += totalCost;
    }
  }

  return [...grouped.values()].map((recipe) => ({
    ...recipe,
    unitCost: recipe.batchCost / recipe.yieldQuantity,
  }));
}

async function getRecipeById(id: number) {
  return (await listRecipeData()).find((recipe) => recipe.id === id);
}

async function estimate(lines: Array<{ recipeId: number; quantity: number }>) {
  const recipes = await listRecipeData();
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const ingredients = new Map<number, {
    ingredientId: number;
    name: string;
    quantity: number;
    unit: "g" | "ml" | "un";
    totalCost: number;
  }>();
  const resultLines = [];
  let totalCost = 0;

  for (const line of lines) {
    const recipe = byId.get(line.recipeId);
    if (!recipe) throw new Error(`A receita ${line.recipeId} não foi encontrada.`);
    const factor = line.quantity / recipe.yieldQuantity;
    const lineCost = recipe.batchCost * factor;
    totalCost += lineCost;
    resultLines.push({
      recipeId: recipe.id,
      recipeName: recipe.name,
      quantity: line.quantity,
      yieldUnit: recipe.yieldUnit,
      batchCost: recipe.batchCost,
      totalCost: lineCost,
    });

    for (const item of recipe.ingredients) {
      const current = ingredients.get(item.ingredientId);
      const quantity = item.quantity * factor;
      if (current) {
        current.quantity += quantity;
        current.totalCost += item.totalCost * factor;
      } else {
        ingredients.set(item.ingredientId, {
          ingredientId: item.ingredientId,
          name: item.name,
          quantity,
          unit: item.unit,
          totalCost: item.totalCost * factor,
        });
      }
    }
  }

  return {
    lines: resultLines,
    ingredients: [...ingredients.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    totalCost,
  };
}

router.get("/overview", async (_req, res): Promise<void> => {
  const [recipes, ingredients, plans] = await Promise.all([
    listRecipeData(),
    db.select().from(ingredientsTable),
    db.select().from(productionPlansTable).orderBy(desc(productionPlansTable.createdAt)).limit(5),
  ]);
  const averageUnitCost = recipes.length
    ? recipes.reduce((sum, recipe) => sum + recipe.unitCost, 0) / recipes.length
    : 0;
  const data = {
    recipeCount: recipes.length,
    ingredientCount: ingredients.length,
    productCount: recipes.reduce((sum, recipe) => sum + recipe.yieldQuantity, 0),
    averageUnitCost,
    recentPlans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      createdAt: plan.createdAt.toISOString(),
      estimate: plan.estimate,
    })),
  };
  res.json(GetOverviewResponse.parse(data));
});

router.get("/ingredients", async (_req, res): Promise<void> => {
  const ingredients = await db.select().from(ingredientsTable).orderBy(ingredientsTable.name);
  res.json(ListIngredientsResponse.parse(ingredients.map(presentIngredient)));
});

router.post("/ingredients", async (req, res): Promise<void> => {
  const parsed = CreateIngredientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [ingredient] = await db.insert(ingredientsTable).values(parsed.data).returning();
  res.status(201).json(CreateIngredientResponse.parse(presentIngredient(ingredient)));
});

router.patch("/ingredients/:id", async (req, res): Promise<void> => {
  const params = UpdateIngredientParams.safeParse(req.params);
  const body = UpdateIngredientBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: params.error?.message ?? body.error?.message });
    return;
  }
  const [ingredient] = await db
    .update(ingredientsTable)
    .set(body.data)
    .where(eq(ingredientsTable.id, params.data.id))
    .returning();
  if (!ingredient) {
    res.status(404).json({ error: "Insumo não encontrado." });
    return;
  }
  res.json(UpdateIngredientResponse.parse(presentIngredient(ingredient)));
});

router.delete("/ingredients/:id", async (req, res): Promise<void> => {
  const params = DeleteIngredientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [linkedRecipe] = await db
    .select({ id: recipeIngredientsTable.id })
    .from(recipeIngredientsTable)
    .where(eq(recipeIngredientsTable.ingredientId, params.data.id))
    .limit(1);
  if (linkedRecipe) {
    res.status(409).json({ error: "O insumo está sendo usado em uma receita." });
    return;
  }
  const [ingredient] = await db
    .delete(ingredientsTable)
    .where(eq(ingredientsTable.id, params.data.id))
    .returning({ id: ingredientsTable.id });
  if (!ingredient) {
    res.status(404).json({ error: "Insumo não encontrado." });
    return;
  }
  res.status(204).end();
});

router.get("/recipes", async (_req, res): Promise<void> => {
  res.json(ListRecipesResponse.parse(await listRecipeData()));
});

router.post("/recipes", async (req, res): Promise<void> => {
  const parsed = CreateRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (hasDuplicateIngredients(parsed.data.ingredients)) {
    res.status(400).json({ error: duplicateIngredientError });
    return;
  }
  if (!await ingredientIdsExist(parsed.data.ingredients.map((item) => item.ingredientId))) {
    res.status(400).json({ error: "Revise os insumos selecionados na receita." });
    return;
  }
  const recipeId = await db.transaction(async (tx) => {
    const [recipe] = await tx.insert(recipesTable).values({
      name: parsed.data.name,
      category: parsed.data.category,
      yieldQuantity: parsed.data.yieldQuantity,
      yieldUnit: parsed.data.yieldUnit,
    }).returning({ id: recipesTable.id });
    await tx.insert(recipeIngredientsTable).values(
      parsed.data.ingredients.map((item) => ({ recipeId: recipe.id, ...item })),
    );
    return recipe.id;
  });
  const recipe = await getRecipeById(recipeId);
  res.status(201).json(CreateRecipeResponse.parse(recipe));
});

router.patch("/recipes/:id", async (req, res): Promise<void> => {
  const params = UpdateRecipeParams.safeParse(req.params);
  const body = UpdateRecipeBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: params.error?.message ?? body.error?.message });
    return;
  }
  if (hasDuplicateIngredients(body.data.ingredients)) {
    res.status(400).json({ error: duplicateIngredientError });
    return;
  }
  if (!await ingredientIdsExist(body.data.ingredients.map((item) => item.ingredientId))) {
    res.status(400).json({ error: "Revise os insumos selecionados na receita." });
    return;
  }
  const updated = await db.transaction(async (tx) => {
    const [recipe] = await tx.update(recipesTable).set({
      name: body.data.name,
      category: body.data.category,
      yieldQuantity: body.data.yieldQuantity,
      yieldUnit: body.data.yieldUnit,
      updatedAt: new Date(),
    }).where(eq(recipesTable.id, params.data.id)).returning({ id: recipesTable.id });
    if (!recipe) return false;
    await tx.delete(recipeIngredientsTable).where(eq(recipeIngredientsTable.recipeId, recipe.id));
    await tx.insert(recipeIngredientsTable).values(
      body.data.ingredients.map((item) => ({ recipeId: recipe.id, ...item })),
    );
    return true;
  });
  if (!updated) {
    res.status(404).json({ error: "Receita não encontrada." });
    return;
  }
  res.json(UpdateRecipeResponse.parse(await getRecipeById(params.data.id)));
});

router.delete("/recipes/:id", async (req, res): Promise<void> => {
  const params = DeleteRecipeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [recipe] = await db
    .delete(recipesTable)
    .where(eq(recipesTable.id, params.data.id))
    .returning({ id: recipesTable.id });
  if (!recipe) {
    res.status(404).json({ error: "Receita não encontrada." });
    return;
  }
  res.status(204).end();
});

router.post("/production/estimate", async (req, res): Promise<void> => {
  const parsed = EstimateProductionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    res.json(EstimateProductionResponse.parse(await estimate(parsed.data.lines)));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Não foi possível estimar a produção." });
  }
});

router.get("/production/plans", async (_req, res): Promise<void> => {
  const plans = await db
    .select()
    .from(productionPlansTable)
    .orderBy(desc(productionPlansTable.createdAt));
  res.json(ListProductionPlansResponse.parse(plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    createdAt: plan.createdAt.toISOString(),
    estimate: plan.estimate,
  }))));
});

router.post("/production/plans", async (req, res): Promise<void> => {
  const parsed = CreateProductionPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const currentEstimate = EstimateProductionResponse.parse(await estimate(parsed.data.lines));
    const [plan] = await db.insert(productionPlansTable).values({
      name: parsed.data.name,
      estimate: currentEstimate,
    }).returning();
    res.status(201).json(CreateProductionPlanResponse.parse({
      id: plan.id,
      name: plan.name,
      createdAt: plan.createdAt.toISOString(),
      estimate: plan.estimate,
    }));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Não foi possível salvar o planejamento." });
  }
});

export default router;
