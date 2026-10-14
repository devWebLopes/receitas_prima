import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, ingredientsTable, recipeIngredientsTable, recipesTable } from "./index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvFile = path.resolve(__dirname, "../../../.env");
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

export async function runSeed() {
  console.log("Iniciando seed de dados de exemplo...");

  const existingIngredients = await db.select().from(ingredientsTable);
  if (existingIngredients.length > 0) {
    console.log("Banco já possui dados cadastrados. Seed ignorado para preservar a integridade.");
    return;
  }

  // 1. Insumos
  const insertedIngredients = await db
    .insert(ingredientsTable)
    .values([
      { name: "Farinha de Trigo Especial", category: "Farinhas", packQuantity: 1, packUnit: "kg", packPrice: 6.5 },
      { name: "Fermento Biológico Seco", category: "Fermentos", packQuantity: 100, packUnit: "g", packPrice: 4.8 },
      { name: "Manteiga sem Sal", category: "Laticínios", packQuantity: 200, packUnit: "g", packPrice: 12.0 },
      { name: "Leite Integral", category: "Laticínios", packQuantity: 1, packUnit: "l", packPrice: 5.2 },
      { name: "Ovos Caipiras", category: "Ovos", packQuantity: 12, packUnit: "un", packPrice: 14.4 },
      { name: "Açúcar Demerara", category: "Açúcares", packQuantity: 1, packUnit: "kg", packPrice: 5.8 },
      { name: "Sal Refinado", category: "Temperos", packQuantity: 1, packUnit: "kg", packPrice: 3.2 },
      { name: "Banana Prata", category: "Frutas", packQuantity: 1, packUnit: "kg", packPrice: 7.9 },
    ])
    .returning();

  console.log(`Inseridos ${insertedIngredients.length} insumos.`);

  const ingMap = new Map(insertedIngredients.map((ing) => [ing.name, ing.id]));

  // 2. Receitas
  // Receita 1: Pão Rústico de Fermentação Natural (2 pães de 500g)
  const [pao] = await db
    .insert(recipesTable)
    .values({
      name: "Pão Rústico Artesanal",
      category: "Pães",
      yieldQuantity: 2,
      yieldUnit: "unidades",
    })
    .returning();

  await db.insert(recipeIngredientsTable).values([
    { recipeId: pao.id, ingredientId: ingMap.get("Farinha de Trigo Especial")!, quantity: 700 }, // 700g
    { recipeId: pao.id, ingredientId: ingMap.get("Fermento Biológico Seco")!, quantity: 7 }, // 7g
    { recipeId: pao.id, ingredientId: ingMap.get("Sal Refinado")!, quantity: 14 }, // 14g
  ]);

  // Receita 2: Cuca Artesanal de Banana
  const [cuca] = await db
    .insert(recipesTable)
    .values({
      name: "Cuca Colonial de Banana",
      category: "Cucas",
      yieldQuantity: 1,
      yieldUnit: "unidade",
    })
    .returning();

  await db.insert(recipeIngredientsTable).values([
    { recipeId: cuca.id, ingredientId: ingMap.get("Farinha de Trigo Especial")!, quantity: 400 }, // 400g
    { recipeId: cuca.id, ingredientId: ingMap.get("Açúcar Demerara")!, quantity: 250 }, // 250g
    { recipeId: cuca.id, ingredientId: ingMap.get("Manteiga sem Sal")!, quantity: 150 }, // 150g
    { recipeId: cuca.id, ingredientId: ingMap.get("Ovos Caipiras")!, quantity: 2 }, // 2 un
    { recipeId: cuca.id, ingredientId: ingMap.get("Leite Integral")!, quantity: 120 }, // 120 ml
    { recipeId: cuca.id, ingredientId: ingMap.get("Banana Prata")!, quantity: 350 }, // 350g
  ]);

  console.log("Receitas de exemplo criadas com sucesso!");
}

if (process.argv[1] && process.argv[1].includes("seed")) {
  runSeed()
    .then(() => {
      console.log("Seed concluído!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Erro no seed:", err);
      process.exit(1);
    });
}
