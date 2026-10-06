import type { Ingredient, RecipeCategory } from '@workspace/api-client-react';

export const recipeCategories: RecipeCategory[] = ['Pães', 'Cucas', 'Quiches', 'Granola', 'Outros'];

export type ParsedRecipeIngredient = {
  sourceName: string;
  quantity: number;
  unit: 'g' | 'ml' | 'un';
  line: number;
};

export type ParsedRecipeText = {
  name: string;
  category: RecipeCategory;
  yieldQuantity: number | null;
  yieldUnit: string;
  ingredients: ParsedRecipeIngredient[];
  errors: string[];
};

const normalize = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

const numberPattern = String.raw`(?:\d+(?:[.,]\d+)?|\d+\/\d+)`;
const supportedUnitPattern = String.raw`(?:unidades?|un|kg|g|ml|l)`;
const unsupportedKitchenUnit = /(?:^|\s)(?:xicaras?|colher(?:es)?|pitadas?|dentes?|copos?|latas?|pacotes?)\b/i;

function parseNumber(value: string): number {
  if (value.includes('/')) {
    const [numerator, denominator] = value.split('/').map(Number);
    return denominator ? numerator / denominator : Number.NaN;
  }
  return Number(value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value);
}

function toBaseUnit(value: number, unit: string): { quantity: number; unit: 'g' | 'ml' | 'un' } | null {
  switch (normalize(unit)) {
    case 'kg':
      return { quantity: value * 1000, unit: 'g' };
    case 'g':
      return { quantity: value, unit: 'g' };
    case 'l':
      return { quantity: value * 1000, unit: 'ml' };
    case 'ml':
      return { quantity: value, unit: 'ml' };
    case 'un':
    case 'unidade':
    case 'unidades':
      return { quantity: value, unit: 'un' };
    default:
      return null;
  }
}

function parseIngredientLine(rawLine: string, line: number): ParsedRecipeIngredient | string {
  const text = rawLine.replace(/^\s*(?:[-*•]\s*|\d+[.)]\s*)/, '').trim();
  if (!text) return `Linha ${line}: informe um ingrediente e uma quantidade.`;

  const quantityFirst = text.match(new RegExp(`^(${numberPattern})\\s*(${supportedUnitPattern})\\s*(?:de\\s+)?(.+)$`, 'i'));
  if (quantityFirst) {
    const value = parseNumber(quantityFirst[1]);
    const converted = toBaseUnit(value, quantityFirst[2]);
    if (converted && value > 0 && quantityFirst[3].trim()) {
      return { sourceName: quantityFirst[3].trim(), quantity: converted.quantity, unit: converted.unit, line };
    }
  }

  const quantityLast = text.match(new RegExp(`^(.+?)(?:\\s*[:=]\\s*|\\s+[–—-]\\s+|\\s+)(${numberPattern})\\s*(${supportedUnitPattern})\\s*$`, 'i'));
  if (quantityLast) {
    const value = parseNumber(quantityLast[2]);
    const converted = toBaseUnit(value, quantityLast[3]);
    if (converted && value > 0 && quantityLast[1].trim()) {
      return { sourceName: quantityLast[1].trim(), quantity: converted.quantity, unit: converted.unit, line };
    }
  }

  const countLine = text.match(new RegExp(`^(${numberPattern})\\s+(.+)$`, 'i'));
  if (countLine && !unsupportedKitchenUnit.test(normalize(countLine[2]))) {
    const value = parseNumber(countLine[1]);
    if (value > 0) {
      return { sourceName: countLine[2].trim(), quantity: value, unit: 'un', line };
    }
  }

  return `Linha ${line}: não consegui ler “${text}”. Use, por exemplo, “500 g farinha de trigo”, “1 kg farinha” ou “2 ovos”. Colheres, xícaras e outras medidas caseiras precisam ser convertidas para g, ml ou un.`;
}

function parseYield(value: string): { quantity: number; unit: string } | null {
  const match = value.trim().match(new RegExp(`^(${numberPattern})\\s+(.+)$`));
  if (!match) return null;
  const quantity = parseNumber(match[1]);
  return quantity > 0 ? { quantity, unit: match[2].trim() } : null;
}

export function parseRecipeText(text: string): ParsedRecipeText {
  const result: ParsedRecipeText = {
    name: '',
    category: 'Outros',
    yieldQuantity: null,
    yieldUnit: '',
    ingredients: [],
    errors: [],
  };
  let inIngredients = false;
  let foundIngredientsSection = false;

  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    const normalizedLine = normalize(line);
    if (/^(modo de preparo|preparo|instrucoes|instrucoes de preparo)\b/.test(normalizedLine)) {
      inIngredients = false;
      return;
    }

    const colon = line.indexOf(':');
    if (colon >= 0) {
      const key = normalize(line.slice(0, colon)).replace(/\s+/g, ' ');
      const value = line.slice(colon + 1).trim();
      if (['nome', 'receita', 'nome da receita'].includes(key)) {
        result.name = value;
        return;
      }
      if (key === 'categoria') {
        const category = recipeCategories.find(item => normalize(item) === normalize(value));
        result.category = category ?? 'Outros';
        return;
      }
      if (['rendimento', 'rendimento por lote'].includes(key)) {
        const parsed = parseYield(value);
        if (parsed) {
          result.yieldQuantity = parsed.quantity;
          result.yieldUnit = parsed.unit;
        }
        return;
      }
    }

    if (/^ingredientes?\b/.test(normalizedLine) && (!line.includes(':') || !line.slice(colon + 1).trim())) {
      inIngredients = true;
      foundIngredientsSection = true;
      return;
    }

    if (inIngredients) {
      const parsed = parseIngredientLine(line, index + 1);
      if (typeof parsed === 'string') result.errors.push(parsed);
      else result.ingredients.push(parsed);
    }
  });

  if (!foundIngredientsSection) {
    result.errors.unshift('Não encontrei a seção “Ingredientes:”. Inclua esse título antes da lista.');
  } else if (!result.ingredients.length && !result.errors.length) {
    result.errors.push('Nenhum ingrediente válido foi encontrado na seção “Ingredientes:”.');
  }
  return result;
}

export function findMatchingIngredient(name: string, unit: ParsedRecipeIngredient['unit'], ingredients: Ingredient[]) {
  const source = normalize(name).replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ');
  const singular = (value: string) => value.replace(/s$/, '');
  return ingredients.find(item => {
    if (item.baseUnit !== unit) return false;
    const candidate = normalize(item.name).replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ');
    return candidate === source || singular(candidate) === singular(source);
  });
}
