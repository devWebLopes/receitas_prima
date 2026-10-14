CREATE TABLE "food_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"pack_quantity" numeric(12, 4) NOT NULL,
	"pack_unit" text NOT NULL,
	"pack_price" numeric(12, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_ingredients_pack_quantity_positive" CHECK ("food_ingredients"."pack_quantity" > 0),
	CONSTRAINT "food_ingredients_pack_price_non_negative" CHECK ("food_ingredients"."pack_price" >= 0),
	CONSTRAINT "food_ingredients_pack_unit_valid" CHECK ("food_ingredients"."pack_unit" IN ('kg','g','l','ml','un'))
);
--> statement-breakpoint
CREATE TABLE "food_production_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"estimate" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	CONSTRAINT "food_recipe_ingredients_recipe_ingredient_unique" UNIQUE("recipe_id","ingredient_id"),
	CONSTRAINT "food_recipe_ingredients_quantity_positive" CHECK ("food_recipe_ingredients"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "food_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"yield_quantity" numeric(12, 4) NOT NULL,
	"yield_unit" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_recipes_yield_quantity_positive" CHECK ("food_recipes"."yield_quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "food_recipe_ingredients" ADD CONSTRAINT "food_recipe_ingredients_recipe_id_food_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."food_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_recipe_ingredients" ADD CONSTRAINT "food_recipe_ingredients_ingredient_id_food_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."food_ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "food_recipe_ingredients_recipe_idx" ON "food_recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "food_recipe_ingredients_ingredient_idx" ON "food_recipe_ingredients" USING btree ("ingredient_id");