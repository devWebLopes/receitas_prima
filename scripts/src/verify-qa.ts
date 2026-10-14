import assert from "node:assert/strict";
import { db, ingredientsTable, recipeIngredientsTable, recipesTable, pool } from "@workspace/db";
import { eq } from "drizzle-orm";
import http from "node:http";

async function main() {
  console.log("=== INICIANDO SUÍTE DE QA: PRD BANCO POSTGRESQL + VERIFICAÇÕES ===");

  // Carrega app dinamicamente para não violar rootDir do scripts/tsconfig.json
  const apiPath = "../../artifacts/api-server/src/app.ts";
  const apiModule = (await import(/* @vite-ignore */ apiPath as string)) as { default: http.RequestListener };
  const app = apiModule.default;

  // Sobe servidor temporário para testar endpoints HTTP
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5098, resolve));
  const baseUrl = "http://localhost:5098/api";

  try {
    // 1. Healthcheck
    const resHealth = await fetch(`${baseUrl}/healthz`);
    assert.equal(resHealth.status, 200, "Healthz deve responder 200");
    const jsonHealth = (await resHealth.json()) as { status: string };
    assert.equal(jsonHealth.status, "ok", "Status deve ser 'ok'");
    console.log("✔ [QA 1/7] /api/healthz responde 200 { status: 'ok' }");

    // 2. Consulta de Insumos e Receitas
    const resIngredients = await fetch(`${baseUrl}/ingredients`);
    assert.equal(resIngredients.status, 200);
    const ingredients = (await resIngredients.json()) as Array<{ id: number; name: string; packPrice: number }>;
    assert.ok(Array.isArray(ingredients) && ingredients.length > 0, "Deve haver insumos cadastrados");
    console.log(`✔ [QA 2/7] Listagem de insumos OK (${ingredients.length} insumos encontrados)`);

    const ing1 = ingredients[0];
    const ing2 = ingredients[1];

    // 3. Teste de Insumo Repetido na Mesma Receita via API -> DEVE SER BLOQUEADO (400)
    const duplicateRecipePayload = {
      name: "Receita Teste com Insumo Duplicado",
      category: "Pães",
      yieldQuantity: 1,
      yieldUnit: "unidade",
      ingredients: [
        { ingredientId: ing1.id, quantity: 100 },
        { ingredientId: ing1.id, quantity: 50 }, // duplicado!
      ],
    };
    const resDup = await fetch(`${baseUrl}/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duplicateRecipePayload),
    });
    assert.equal(resDup.status, 400, "API deve rejeitar insumo duplicado com HTTP 400");
    const jsonDup = (await resDup.json()) as { error: string };
    assert.ok(
      jsonDup.error.includes("mais de uma vez"),
      `Mensagem de erro deve avisar sobre duplicidade. Recebido: ${jsonDup.error}`
    );
    console.log("✔ [QA 3/7] Inserir insumo repetido na mesma receita via API foi bloqueado com 400");

    // 4. Teste de Constraint UNIQUE no PostgreSQL diretamente
    let dbUniqueConstraintCaught = false;
    try {
      const [testRecipe] = await db
        .insert(recipesTable)
        .values({
          name: "Receita Teste DB Constraint",
          category: "Pães",
          yieldQuantity: 1,
          yieldUnit: "un",
        })
        .returning();

      // Primeira inserção OK
      await db.insert(recipeIngredientsTable).values({
        recipeId: testRecipe.id,
        ingredientId: ing1.id,
        quantity: 10,
      });

      // Segunda inserção deve estourar erro 23505 (unique violation)
      await db.insert(recipeIngredientsTable).values({
        recipeId: testRecipe.id,
        ingredientId: ing1.id,
        quantity: 20,
      });
    } catch (err: any) {
      const code = err.code || err.cause?.code;
      const message = err.message || err.cause?.message || "";
      if (code === "23505" || message.includes("food_recipe_ingredients_recipe_ingredient_unique")) {
        dbUniqueConstraintCaught = true;
      } else {
        throw err;
      }
    }
    assert.ok(dbUniqueConstraintCaught, "Constraint UNIQUE no banco deve disparar erro 23505");
    console.log("✔ [QA 4/7] Constraint UNIQUE (recipe_id, ingredient_id) validada diretamente no PostgreSQL");

    // 5. Mesmo insumo em receitas distintas -> PERMITIDO
    const resValidRecipe = await fetch(`${baseUrl}/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Receita Teste Válida A",
        category: "Cucas",
        yieldQuantity: 5,
        yieldUnit: "unidades",
        ingredients: [
          { ingredientId: ing1.id, quantity: 100 },
          { ingredientId: ing2.id, quantity: 200 },
        ],
      }),
    });
    assert.equal(resValidRecipe.status, 201, "Criação de receita válida deve retornar 201");
    const createdRecipeA = (await resValidRecipe.json()) as { id: number };

    const resValidRecipeB = await fetch(`${baseUrl}/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Receita Teste Válida B",
        category: "Outros",
        yieldQuantity: 10,
        yieldUnit: "unidades",
        ingredients: [
          { ingredientId: ing1.id, quantity: 50 }, // mesmo ing1 em outra receita
        ],
      }),
    });
    assert.equal(resValidRecipeB.status, 201);
    const createdRecipeB = (await resValidRecipeB.json()) as { id: number };
    console.log("✔ [QA 5/7] Mesmo insumo compartilhado entre receitas diferentes funciona perfeitamente");

    // 6. Integridade Referencial: Excluir insumo em uso é bloqueado (409)
    const resDelIng = await fetch(`${baseUrl}/ingredients/${ing1.id}`, { method: "DELETE" });
    assert.equal(resDelIng.status, 409, "Excluir insumo em uso deve ser bloqueado com 409");
    console.log("✔ [QA 6/7] Exclusão de insumo em uso é bloqueada (onDelete: RESTRICT)");

    // 7. Cascade e Snapshot de Planos
    // Criar um plano de produção com snapshot
    const resPlan = await fetch(`${baseUrl}/production/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Plano Snapshot QA",
        lines: [{ recipeId: createdRecipeA.id, quantity: 10 }],
      }),
    });
    assert.equal(resPlan.status, 201);
    const createdPlan = (await resPlan.json()) as { id: number; estimate: { totalCost: number } };
    const originalTotalCost = createdPlan.estimate.totalCost;

    // Altera preço de um dos insumos da receita
    await fetch(`${baseUrl}/ingredients/${ing1.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packPrice: ing1.packPrice * 2 }),
    });

    // Consulta plano salvo: o custo DEVE ser imutável (snapshot)
    const resPlansList = await fetch(`${baseUrl}/production/plans`);
    const plansList = (await resPlansList.json()) as Array<{ id: number; estimate: { totalCost: number } }>;
    const retrievedPlan = plansList.find((p) => p.id === createdPlan.id);
    assert.ok(retrievedPlan, "Plano deve existir na lista");
    assert.equal(
      retrievedPlan.estimate.totalCost,
      originalTotalCost,
      "Plano salvo deve ser um snapshot imutável e não sofrer alteração de preço"
    );

    // Restaura o preço do insumo
    await fetch(`${baseUrl}/ingredients/${ing1.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packPrice: ing1.packPrice }),
    });

    // Exclui receita de teste criada e verifica CASCADE nos itens
    const resDelRecipe = await fetch(`${baseUrl}/recipes/${createdRecipeA.id}`, { method: "DELETE" });
    assert.equal(resDelRecipe.status, 204);
    await fetch(`${baseUrl}/recipes/${createdRecipeB.id}`, { method: "DELETE" });

    // Verifica que itens foram removidos por CASCADE
    const orphanItems = await db
      .select()
      .from(recipeIngredientsTable)
      .where(eq(recipeIngredientsTable.recipeId, createdRecipeA.id));
    assert.equal(orphanItems.length, 0, "Itens da receita devem ser apagados via CASCADE");
    console.log("✔ [QA 7/7] Excluir receita faz CASCADE nos itens e Planos de Produção são snapshots imutáveis");

    console.log("\n========================================================");
    console.log("✅ TODAS AS VERIFICAÇÕES DE QA PASSARAM COM SUCESSO!");
    console.log("========================================================");
  } finally {
    server.close();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ FALHA NO QA:", err);
  process.exit(1);
});
