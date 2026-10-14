import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import {
  db,
  pool,
  ingredientsTable,
  recipeIngredientsTable,
  recipesTable,
} from "./index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvFile = path.resolve(__dirname, "../../../.env");
if (existsSync(rootEnvFile) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(rootEnvFile);
}

export interface IngredientDefinition {
  name: string;
  category: string;
  packQuantity: number;
  packUnit: "kg" | "g" | "l" | "ml" | "un";
  packPrice: number;
}

export const INGREDIENT_DEFINITIONS: Record<string, IngredientDefinition> = {
  "Farinha de Trigo": {
    name: "Farinha de Trigo",
    category: "Farinhas",
    packQuantity: 1,
    packUnit: "kg",
    packPrice: 6.5,
  },
  "Farinha de Trigo Integral": {
    name: "Farinha de Trigo Integral",
    category: "Farinhas",
    packQuantity: 1,
    packUnit: "kg",
    packPrice: 8.5,
  },
  "Óleo Vegetal": {
    name: "Óleo Vegetal",
    category: "Óleos e Gorduras",
    packQuantity: 900,
    packUnit: "ml",
    packPrice: 7.9,
  },
  "Sal Refinado": {
    name: "Sal Refinado",
    category: "Temperos",
    packQuantity: 1,
    packUnit: "kg",
    packPrice: 3.2,
  },
  "Água": {
    name: "Água",
    category: "Líquidos",
    packQuantity: 1,
    packUnit: "l",
    packPrice: 0.0,
  },
  "Ovos": {
    name: "Ovos",
    category: "Ovos",
    packQuantity: 12,
    packUnit: "un",
    packPrice: 14.4,
  },
  "Fermento em Pó": {
    name: "Fermento em Pó",
    category: "Fermentos",
    packQuantity: 100,
    packUnit: "g",
    packPrice: 4.5,
  },
  "Manteiga sem Sal": {
    name: "Manteiga sem Sal",
    category: "Laticínios",
    packQuantity: 200,
    packUnit: "g",
    packPrice: 12.0,
  },
  "Açúcar Mascavo": {
    name: "Açúcar Mascavo",
    category: "Açúcares",
    packQuantity: 1,
    packUnit: "kg",
    packPrice: 9.8,
  },
  "Cacau em Pó": {
    name: "Cacau em Pó",
    category: "Chocolates e Cacau",
    packQuantity: 500,
    packUnit: "g",
    packPrice: 22.0,
  },
  "Lecitina de Soja": {
    name: "Lecitina de Soja",
    category: "Emulsificantes",
    packQuantity: 250,
    packUnit: "g",
    packPrice: 18.0,
  },
  "Amido de Milho": {
    name: "Amido de Milho",
    category: "Farinhas e Amidos",
    packQuantity: 500,
    packUnit: "g",
    packPrice: 6.0,
  },
  "Aveia Fina": {
    name: "Aveia Fina",
    category: "Cereais",
    packQuantity: 500,
    packUnit: "g",
    packPrice: 7.5,
  },
  "Açúcar Peneirado": {
    name: "Açúcar Peneirado",
    category: "Açúcares",
    packQuantity: 1,
    packUnit: "kg",
    packPrice: 5.5,
  },
  "Açúcar Derretido": {
    name: "Açúcar Derretido",
    category: "Açúcares",
    packQuantity: 1,
    packUnit: "l",
    packPrice: 6.0,
  },
  "Aroma de Coco": {
    name: "Aroma de Coco",
    category: "Aromas e Essências",
    packQuantity: 30,
    packUnit: "ml",
    packPrice: 5.0,
  },
  "Coco Ralado": {
    name: "Coco Ralado",
    category: "Frutas e Castanhas",
    packQuantity: 100,
    packUnit: "g",
    packPrice: 6.0,
  },
  "Mel": {
    name: "Mel",
    category: "Açúcares",
    packQuantity: 500,
    packUnit: "g",
    packPrice: 24.0,
  },
  "Linhaça": {
    name: "Linhaça",
    category: "Sementes e Grãos",
    packQuantity: 200,
    packUnit: "g",
    packPrice: 6.5,
  },
  "Canela em Pó": {
    name: "Canela em Pó",
    category: "Temperos",
    packQuantity: 50,
    packUnit: "g",
    packPrice: 5.0,
  },
};

interface ParsedRecipeItem {
  canonicalName: string;
  rawText: string;
  quantity: number; // quantidade convertida na unidade base (g, ml, un)
}

interface ParsedRecipe {
  num: number;
  name: string;
  category: string;
  yieldQuantity: number;
  yieldUnit: string;
  items: ParsedRecipeItem[];
}

function parseQuantityAndCanonical(rawLine: string): ParsedRecipeItem {
  const rawLower = rawLine.toLowerCase();

  // Limpa anotações em itálico e parênteses extras informativos
  const cleanLine = rawLine
    .replace(/^\s*-\s*/, "")
    .replace(/\*\(.*?\)\*/g, "")
    .trim();

  const lower = cleanLine.toLowerCase();

  // 1. Identificar ingrediente canônico
  let canonicalName = "";
  if (lower.includes("farinha integral")) {
    canonicalName = "Farinha de Trigo Integral";
  } else if (lower.includes("farinha branca") || lower.includes("farinha de trigo")) {
    canonicalName = "Farinha de Trigo";
  } else if (lower.includes("óleo")) {
    canonicalName = "Óleo Vegetal";
  } else if (lower.includes("açúcar mascavo")) {
    canonicalName = "Açúcar Mascavo";
  } else if (lower.includes("açúcar derretido")) {
    canonicalName = "Açúcar Derretido";
  } else if (lower.includes("açúcar peneirado") || lower.includes("açúcar")) {
    canonicalName = "Açúcar Peneirado";
  } else if (lower.includes("cacau em pó")) {
    canonicalName = "Cacau em Pó";
  } else if (lower.includes("lecitina")) {
    canonicalName = "Lecitina de Soja";
  } else if (lower.includes("aroma de coco")) {
    canonicalName = "Aroma de Coco";
  } else if (lower.includes("coco")) {
    canonicalName = "Coco Ralado";
  } else if (lower.includes("aveia")) {
    canonicalName = "Aveia Fina";
  } else if (lower.includes("amido")) {
    canonicalName = "Amido de Milho";
  } else if (lower.includes("manteiga")) {
    canonicalName = "Manteiga sem Sal";
  } else if (lower.includes("mel")) {
    canonicalName = "Mel";
  } else if (lower.includes("linhaça")) {
    canonicalName = "Linhaça";
  } else if (lower.includes("canela")) {
    canonicalName = "Canela em Pó";
  } else if (lower.includes("sal")) {
    canonicalName = "Sal Refinado";
  } else if (lower.includes("fermento")) {
    canonicalName = "Fermento em Pó";
  } else if (lower.includes("ovo")) {
    canonicalName = "Ovos";
  } else if (lower.includes("água")) {
    canonicalName = "Água";
  } else {
    throw new Error(`Insumo não reconhecido na linha: "${rawLine}"`);
  }

  // 2. Extrair quantidade e converter para unidade base (g, ml, un)
  let quantity = 0;

  // Casos especiais diretos do caderno
  if (lower.includes("sem quantidade legível") || rawLower.includes("sem quantidade legível")) {
    quantity = 10; // 10g padrão para emulsificante lecitina
    return { canonicalName, rawText: rawLine.trim(), quantity };
  }

  // Normalização de números (milhar pt-BR e símbolos)
  const norm = lower
    .replace(/±/g, "")
    .replace(/(\d+)\.(\d{3})\s*g/g, "$1$2 g"); // 1.800 g -> 1800 g

  // Se a linha começa com peso/volume explícito (ex: "50 g de sal (2,5 colheres...)" ou "1.800 g de manteiga")
  const leadingUnitMatch = norm.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|litros?|l|ml)\b/);
  if (leadingUnitMatch) {
    const val = Number(leadingUnitMatch[1].replace(",", "."));
    const unit = leadingUnitMatch[2];
    if (unit === "kg" || unit.startsWith("l")) {
      quantity = val * 1000;
    } else {
      quantity = val;
    }
    return { canonicalName, rawText: rawLine.trim(), quantity };
  }

  if (lower.includes("pitada de sal") || lower.includes("pitada")) {
    const pitadasMatch = lower.match(/(\d+)\s*pitadas?/);
    const count = pitadasMatch ? Number(pitadasMatch[1]) : 1;
    quantity = count; // 1g por pitada
  } else if (lower.includes("xícara")) {
    let xicCount = 1;
    if (lower.includes("½") || lower.includes("1/2")) {
      xicCount = 0.5;
    } else {
      const match = lower.match(/(\d+(?:[.,]\d+)?)\s*xícaras?/);
      if (match) xicCount = Number(match[1].replace(",", "."));
    }

    if (canonicalName === "Farinha de Trigo" || canonicalName === "Farinha de Trigo Integral") {
      quantity = xicCount * 120; // 1 xícara de farinha = 120g
    } else if (canonicalName === "Óleo Vegetal") {
      quantity = xicCount * 240; // 1 xícara de óleo = 240ml
    } else if (canonicalName === "Água") {
      quantity = xicCount * 240; // 1 xícara de água = 240ml
    } else {
      quantity = xicCount * 150;
    }
  } else if (lower.includes("colher (sopa)") || lower.includes("colheres (sopa)")) {
    const match = lower.match(/(\d+(?:[.,]\d+)?)\s*colher(?:es)?\s*\(sopa\)/);
    const colheres = match ? Number(match[1].replace(",", ".")) : 1;
    quantity = colheres * 10; // 10g por colher de sopa
  } else if (lower.includes("colher (café)")) {
    quantity = 2; // 2g
  } else if (lower.includes("ovos") || lower.includes("ovo")) {
    const match = lower.match(/(\d+)\s*ovos?/);
    quantity = match ? Number(match[1]) : 1;
  } else {
    // Procura por números explícitos com unidades (kg, g, litros, ml) em qualquer parte
    const kgMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*kg/);
    const gMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*g(?![a-z])/);
    const lMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:litros?|l)(?![a-z])/);
    const mlMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*ml/);

    if (kgMatch) {
      quantity = Number(kgMatch[1].replace(",", ".")) * 1000;
    } else if (gMatch) {
      quantity = Number(gMatch[1].replace(",", "."));
    } else if (lMatch) {
      quantity = Number(lMatch[1].replace(",", ".")) * 1000;
    } else if (mlMatch) {
      quantity = Number(mlMatch[1].replace(",", "."));
    } else {
      throw new Error(`Não foi possível determinar a quantidade em: "${rawLine}"`);
    }
  }

  return {
    canonicalName,
    rawText: rawLine.trim(),
    quantity,
  };
}

export function parseReceitasMarkdown(content: string): ParsedRecipe[] {
  const sections = content.split(/\n(?=##\s+\d+\.)/);
  const recipes: ParsedRecipe[] = [];

  for (const sec of sections) {
    const headerMatch = sec.match(/^##\s+(\d+)\.\s+(.+)$/m);
    if (!headerMatch) continue;

    const num = Number(headerMatch[1]);
    const rawName = headerMatch[2].trim();

    // Determina categoria
    let category = "Outros";
    if (/biscoito/i.test(rawName)) category = "Biscoitos";
    else if (/massa/i.test(rawName)) category = "Massas";
    else if (/pão/i.test(rawName)) category = "Pães";
    else if (/cuca/i.test(rawName)) category = "Cucas";

    // Determina rendimento padrão
    let yieldQuantity = 1;
    let yieldUnit = "receita";

    if (/massa para pizza/i.test(rawName)) {
      yieldQuantity = 1;
      yieldUnit = "unidade";
    } else if (/amanteigado.*cacau/i.test(rawName)) {
      yieldQuantity = 75;
      yieldUnit = "pacotes (200g)";
    } else if (/biscoito de coco/i.test(rawName) || /biscoito de aveia/i.test(rawName)) {
      yieldQuantity = 5;
      yieldUnit = "pacotes (200g)";
    } else if (/pão integral/i.test(rawName)) {
      yieldQuantity = 10;
      yieldUnit = "unidades (500g)";
    } else if (/cuca/i.test(rawName)) {
      yieldQuantity = 8;
      yieldUnit = "unidades";
    }

    // Procura por especificação de rendimento no texto
    const yieldMatch = sec.match(/\*\*Rendimento:\*\*\s*~?\s*(\d+)\s*([^\n.]+)/i);
    if (yieldMatch) {
      yieldQuantity = Number(yieldMatch[1]);
      yieldUnit = yieldMatch[2].trim();
    }

    // Extrair linhas de ingredientes (- ...)
    const lines = sec.split("\n");
    const itemLines: string[] = [];
    let insideIngredients = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("**Ingredientes") || trimmed.startsWith("**Ingredientes —")) {
        insideIngredients = true;
        continue;
      }
      if (insideIngredients) {
        if (trimmed.startsWith("**Preparo") || trimmed.startsWith("**Rendimento") || trimmed.startsWith("---") || (trimmed.startsWith("##") && !trimmed.startsWith("## " + num))) {
          insideIngredients = false;
          continue;
        }
        if (trimmed.startsWith("- ")) {
          itemLines.push(trimmed);
        }
      }
    }

    const items: ParsedRecipeItem[] = [];
    for (const itemLine of itemLines) {
      const parsed = parseQuantityAndCanonical(itemLine);
      items.push(parsed);
    }

    recipes.push({
      num,
      name: rawName,
      category,
      yieldQuantity,
      yieldUnit,
      items,
    });
  }

  return recipes;
}

export async function runImportReceitas(receitasFilePath?: string) {
  const filePath = receitasFilePath || path.resolve(__dirname, "../../../docs/receitas.md");
  if (!existsSync(filePath)) {
    throw new Error(`Arquivo de receitas não encontrado em: ${filePath}`);
  }

  console.log(`📖 Lendo arquivo: ${filePath}`);
  const mdContent = readFileSync(filePath, "utf-8");
  const recipes = parseReceitasMarkdown(mdContent);

  console.log(`\n📋 Foram identificadas ${recipes.length} receitas no arquivo.`);

  // 1. Identificar todos os insumos sem repetição
  const uniqueIngredientNames = new Set<string>();
  for (const recipe of recipes) {
    for (const item of recipe.items) {
      uniqueIngredientNames.add(item.canonicalName);
    }
  }

  console.log(`🔍 Total de insumos únicos identificados: ${uniqueIngredientNames.size}`);

  // 2. Cadastrar insumos no banco (reaproveitando existentes para idempotência)
  console.log("\n📦 Cadastrando/verificando insumos na tabela 'food_ingredients'...");
  const ingredientIdMap = new Map<string, number>();

  for (const ingName of uniqueIngredientNames) {
    const def = INGREDIENT_DEFINITIONS[ingName];
    if (!def) {
      throw new Error(`Definição cadastral ausente para o insumo: ${ingName}`);
    }

    const [existing] = await db
      .select({ id: ingredientsTable.id })
      .from(ingredientsTable)
      .where(eq(ingredientsTable.name, def.name));

    if (existing) {
      ingredientIdMap.set(def.name, existing.id);
      console.log(`  • [Existente] ${def.name} (id: ${existing.id})`);
    } else {
      const [inserted] = await db
        .insert(ingredientsTable)
        .values({
          name: def.name,
          category: def.category,
          packQuantity: def.packQuantity,
          packUnit: def.packUnit,
          packPrice: def.packPrice,
        })
        .returning({ id: ingredientsTable.id });
      ingredientIdMap.set(def.name, inserted.id);
      console.log(`  • [Cadastrado] ${def.name} (${def.category}) - Pacote: ${def.packQuantity}${def.packUnit} por R$ ${def.packPrice.toFixed(2)} (id: ${inserted.id})`);
    }
  }

  // 3. Cadastrar receitas e vínculos
  console.log("\n🍳 Cadastrando receitas na tabela 'food_recipes' e itens na 'food_recipe_ingredients'...");

  for (const recipe of recipes) {
    const [existingRecipe] = await db
      .select({ id: recipesTable.id })
      .from(recipesTable)
      .where(eq(recipesTable.name, recipe.name));

    let recipeId: number;
    if (existingRecipe) {
      recipeId = existingRecipe.id;
      // Atualiza rendimento e remove itens antigos para recriar
      await db
        .update(recipesTable)
        .set({
          category: recipe.category,
          yieldQuantity: recipe.yieldQuantity,
          yieldUnit: recipe.yieldUnit,
          updatedAt: new Date(),
        })
        .where(eq(recipesTable.id, recipeId));
      await db
        .delete(recipeIngredientsTable)
        .where(eq(recipeIngredientsTable.recipeId, recipeId));
      console.log(`\n  📝 Atualizando receita: "${recipe.name}" (id: ${recipeId})`);
    } else {
      const [inserted] = await db
        .insert(recipesTable)
        .values({
          name: recipe.name,
          category: recipe.category,
          yieldQuantity: recipe.yieldQuantity,
          yieldUnit: recipe.yieldUnit,
        })
        .returning({ id: recipesTable.id });
      recipeId = inserted.id;
      console.log(`\n  ✨ Nova receita cadastrada: "${recipe.name}" (id: ${recipeId})`);
    }

    console.log(`     Rendimento: ${recipe.yieldQuantity} ${recipe.yieldUnit} | Categoria: ${recipe.category}`);
    console.log(`     Composição (${recipe.items.length} itens):`);

    // Inserir itens sem duplicar (se houver o mesmo insumo na receita, somar quantidades)
    const aggregatedItems = new Map<number, { quantity: number; rawText: string; name: string }>();
    for (const item of recipe.items) {
      const ingId = ingredientIdMap.get(item.canonicalName);
      if (!ingId) {
        throw new Error(`ID não encontrado para o insumo ${item.canonicalName}`);
      }
      const current = aggregatedItems.get(ingId);
      if (current) {
        current.quantity += item.quantity;
      } else {
        aggregatedItems.set(ingId, {
          quantity: item.quantity,
          rawText: item.rawText,
          name: item.canonicalName,
        });
      }
    }

    for (const [ingId, item] of aggregatedItems) {
      await db.insert(recipeIngredientsTable).values({
        recipeId,
        ingredientId: ingId,
        quantity: item.quantity,
      });
      const def = INGREDIENT_DEFINITIONS[item.name];
      const baseUnit = def.packUnit === "kg" || def.packUnit === "g" ? "g" : def.packUnit === "l" || def.packUnit === "ml" ? "ml" : "un";
      console.log(`       - ${item.name}: ${item.quantity} ${baseUnit} (original: "${item.rawText}")`);
    }
  }

  console.log("\n========================================================");
  console.log("✅ Importação de receitas e insumos concluída com sucesso!");
  console.log(`   Total de receitas importadas: ${recipes.length}`);
  console.log(`   Total de insumos cadastrados: ${uniqueIngredientNames.size}`);
  console.log("========================================================\n");
}

if (
  process.argv[1] &&
  (process.argv[1].includes("import-receitas") || process.argv[1].endsWith("import-receitas.ts"))
) {
  runImportReceitas()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("❌ Erro ao importar receitas:", err);
      try {
        await pool.end();
      } catch {
        // ignore
      }
      process.exit(1);
    });
}
