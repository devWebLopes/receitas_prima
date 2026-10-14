import { existsSync } from "node:fs";
import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import {
  db,
  pool,
  ingredientsTable,
  recipeIngredientsTable,
  recipesTable,
  productionPlansTable,
} from "./index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvFile = path.resolve(__dirname, "../../../.env");
if (existsSync(rootEnvFile) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(rootEnvFile);
}

export interface ClearDatabaseOptions {
  /** Pula a confirmação interativa se verdadeiro */
  force?: boolean;
}

export async function runClear(options: ClearDatabaseOptions = {}) {
  console.log("🔍 Verificando registros no banco de dados...");

  const [
    [ingredientsRes],
    [recipesRes],
    [recipeIngredientsRes],
    [productionPlansRes],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(ingredientsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(recipesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(recipeIngredientsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(productionPlansTable),
  ]);

  const ingCount = Number(ingredientsRes?.count ?? 0);
  const recCount = Number(recipesRes?.count ?? 0);
  const recIngCount = Number(recipeIngredientsRes?.count ?? 0);
  const planCount = Number(productionPlansRes?.count ?? 0);
  const total = ingCount + recCount + recIngCount + planCount;

  console.log("\nRegistros encontrados no banco:");
  console.log(`  • Insumos (food_ingredients): ${ingCount}`);
  console.log(`  • Receitas (food_recipes): ${recCount}`);
  console.log(`  • Ingredientes de Receitas (food_recipe_ingredients): ${recIngCount}`);
  console.log(`  • Planos de Produção (food_production_plans): ${planCount}`);
  console.log("  -----------------------------------------");
  console.log(`  Total de registros: ${total}\n`);

  if (total === 0) {
    console.log("ℹ️  O banco de dados já está limpo (nenhum registro encontrado).");
    return;
  }

  const isForce =
    Boolean(options.force) ||
    process.argv.includes("--yes") ||
    process.argv.includes("-y") ||
    process.argv.includes("--force");

  if (!isForce) {
    if (!process.stdin.isTTY) {
      console.error(
        "❌ Execução não interativa detectada. Para apagar os dados sem confirmação manual, informe a flag '--yes' ou '--force'."
      );
      process.exit(1);
    }

    const rl = readline.createInterface({ input, output });
    const answer = await rl.question(
      "⚠️  ATENÇÃO: Esta ação é irreversível e apagará TODOS os registros listados acima.\n" +
      "Deseja prosseguir com a exclusão? Digite 'sim' ou 's' para confirmar: "
    );
    rl.close();

    const confirmed = ["s", "sim", "y", "yes"].includes(answer.trim().toLowerCase());
    if (!confirmed) {
      console.log("❌ Operação cancelada. Nenhum registro foi excluído.");
      return;
    }
  }

  console.log("🗑️  Apagando todos os registros e reiniciando sequências de ID...");
  await db.execute(
    sql`TRUNCATE TABLE food_recipe_ingredients, food_recipes, food_ingredients, food_production_plans RESTART IDENTITY CASCADE;`
  );

  console.log("✅ Banco de dados limpo com sucesso! Todas as tabelas estão vazias e os IDs foram reiniciados.");
}

if (
  process.argv[1] &&
  (process.argv[1].includes("clear") || process.argv[1].endsWith("clear.ts"))
) {
  runClear()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("❌ Erro ao apagar registros do banco:", err);
      try {
        await pool.end();
      } catch {
        // ignore
      }
      process.exit(1);
    });
}
