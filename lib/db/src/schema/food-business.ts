import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const ingredientsTable = pgTable("food_ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  packQuantity: numeric("pack_quantity", { precision: 12, scale: 4, mode: "number" }).notNull(),
  packUnit: text("pack_unit").notNull(),
  packPrice: numeric("pack_price", { precision: 12, scale: 4, mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recipesTable = pgTable("food_recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  yieldQuantity: numeric("yield_quantity", { precision: 12, scale: 4, mode: "number" }).notNull(),
  yieldUnit: text("yield_unit").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const recipeIngredientsTable = pgTable("food_recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipesTable.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredientsTable.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 12, scale: 4, mode: "number" }).notNull(),
});

export const productionPlansTable = pgTable("food_production_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  estimate: jsonb("estimate").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIngredientSchema = createInsertSchema(ingredientsTable).omit({ id: true, createdAt: true });
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type Ingredient = typeof ingredientsTable.$inferSelect;
export const insertRecipeSchema = createInsertSchema(recipesTable).omit({ id: true, updatedAt: true });
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipesTable.$inferSelect;
export type RecipeIngredient = typeof recipeIngredientsTable.$inferSelect;
export type ProductionPlan = typeof productionPlansTable.$inferSelect;
