import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Check, FileText, Upload, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetOverviewQueryKey,
  getListRecipesQueryKey,
  useCreateRecipe,
} from '@workspace/api-client-react';
import type {
  Ingredient,
  RecipeCategory,
  RecipeInput,
} from '@workspace/api-client-react';
import {
  findMatchingIngredient,
  parseRecipeText,
  recipeCategories,
  type ParsedRecipeIngredient,
  type ParsedRecipeText,
} from '@/lib/recipe-import';

type ImportRow = ParsedRecipeIngredient & { ingredientId: string };
type ImportDraft = Omit<ParsedRecipeText, 'ingredients'> & { ingredients: ImportRow[] };

type Props = {
  ingredients: Ingredient[];
  close: () => void;
};

const template = `Nome: Pão caseiro
Categoria: Pães
Rendimento: 12 unidades

Ingredientes:
500 g farinha de trigo
10 g fermento biológico
2 ovos

Modo de preparo:
Escreva o preparo aqui; este conteúdo não será importado.`;

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([template], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo-de-receita-miolo.txt';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function RecipeImportDialog({ ingredients, close }: Props) {
  const qc = useQueryClient();
  const create = useCreateRecipe();
  const [draft, setDraft] = useState<ImportDraft>();
  const [fileName, setFileName] = useState('');
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    setDraft(undefined);
    setFileName('');
    setError('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError('Escolha um arquivo com extensão .txt.');
      return;
    }
    if (file.size > 512_000) {
      setError('O arquivo deve ter no máximo 500 KB.');
      return;
    }
    setReading(true);
    try {
      const text = await file.text();
      if (text.includes('\uFFFD')) {
        setError('Não consegui ler a codificação do arquivo. Salve o TXT em UTF-8 e tente novamente.');
        return;
      }
      const parsed = parseRecipeText(text);
      setFileName(file.name);
      setDraft({
        ...parsed,
        ingredients: parsed.ingredients.map(row => ({
          ...row,
          ingredientId: String(findMatchingIngredient(row.sourceName, row.unit, ingredients)?.id ?? ''),
        })),
      });
    } catch {
      setError('Não foi possível ler este arquivo. Confira se ele é um TXT válido.');
    } finally {
      setReading(false);
    }
  };

  const updateDraft = (patch: Partial<Pick<ImportDraft, 'name' | 'category' | 'yieldQuantity' | 'yieldUnit'>>) => {
    setDraft(current => current ? { ...current, ...patch } : current);
  };

  const updateIngredient = (index: number, patch: Partial<ImportRow>) => {
    setDraft(current => current ? {
      ...current,
      ingredients: current.ingredients.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row),
    } : current);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    if (!draft.name.trim()) {
      setError('Informe o nome da receita.');
      return;
    }
    if (!draft.yieldQuantity || draft.yieldQuantity <= 0 || !draft.yieldUnit.trim()) {
      setError('Informe um rendimento válido, por exemplo: 12 unidades.');
      return;
    }
    if (draft.errors.length) {
      setError('Corrija os problemas listados no arquivo TXT e importe-o novamente.');
      return;
    }
    if (!draft.ingredients.length || draft.ingredients.some(row => !row.ingredientId || !row.quantity || row.quantity <= 0)) {
      setError('Associe cada ingrediente a um insumo cadastrado e confira as quantidades.');
      return;
    }

    const payload: RecipeInput = {
      name: draft.name.trim(),
      category: draft.category,
      yieldQuantity: draft.yieldQuantity,
      yieldUnit: draft.yieldUnit.trim(),
      ingredients: draft.ingredients.map(row => ({
        ingredientId: Number(row.ingredientId),
        quantity: row.quantity,
      })),
    };
    setError('');
    create.mutate({ data: payload }, {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getListRecipesQueryKey() });
        void qc.invalidateQueries({ queryKey: getGetOverviewQueryKey() });
        close();
      },
      onError: () => setError('Não foi possível cadastrar a receita. Confira os insumos e tente novamente.'),
    });
  };

  const isReady = !!draft
    && !draft.errors.length
    && !!draft.name.trim()
    && !!draft.yieldQuantity
    && draft.yieldQuantity > 0
    && !!draft.yieldUnit.trim()
    && draft.ingredients.length > 0
    && draft.ingredients.every(row => !!row.ingredientId && row.quantity > 0);

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="recipe-import-title">
      <div className="modal-head">
        <div>
          <div className="eyebrow">Importação de receita</div>
          <h2 id="recipe-import-title" className="serif text-3xl mt-1">Adicionar via TXT</h2>
          <p className="text-sm text-muted-foreground mt-1">A receita fica pré-preenchida para você revisar antes de cadastrar.</p>
        </div>
        <button className="icon-btn" onClick={close} aria-label="Fechar importação" data-testid="button-close-recipe-import"><X size={19}/></button>
      </div>

      <form className="space-y-5" onSubmit={submit}>
        <div className="rounded-lg border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-sm font-bold"><FileText size={16}/> Modelo de arquivo</div>
            <button type="button" className="btn btn-secondary !py-2 !px-3 text-xs" onClick={downloadTemplate} data-testid="button-download-recipe-template">Baixar modelo</button>
          </div>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{template}</pre>
          <p className="text-xs text-muted-foreground mt-3">Use quantidades em g, kg, ml, l ou un. “2 ovos” também é aceito. Medidas como xícaras e colheres precisam ser convertidas antes.</p>
        </div>

        <div className="field">
          <label htmlFor="recipe-text-file">Arquivo da receita (.txt)</label>
          <input id="recipe-text-file" type="file" accept=".txt,text/plain" onChange={chooseFile} disabled={reading} data-testid="input-recipe-txt"/>
          {reading && <span className="text-xs text-muted-foreground">Lendo arquivo…</span>}
          {fileName && <span className="text-xs text-muted-foreground" data-testid="text-recipe-import-filename">Arquivo: {fileName}</span>}
        </div>

        {draft && <>
          <div className="eyebrow">Prévia e revisão</div>
          {draft.errors.length > 0 && <div className="error-note" role="alert" data-testid="recipe-import-parse-errors">
            <strong>Há linhas que não foram importadas:</strong>
            <ul className="list-disc pl-5 mt-2 space-y-1">{draft.errors.map(message => <li key={message}>{message}</li>)}</ul>
          </div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field"><label htmlFor="recipe-import-name">Nome da receita</label><input id="recipe-import-name" value={draft.name} onChange={event => updateDraft({ name: event.target.value })} placeholder="Ex.: Pão caseiro" data-testid="input-import-recipe-name"/></div>
            <div className="field"><label htmlFor="recipe-import-category">Categoria</label><select id="recipe-import-category" value={draft.category} onChange={event => updateDraft({ category: event.target.value as RecipeCategory })} data-testid="select-import-recipe-category">{recipeCategories.map(category => <option key={category} value={category}>{category}</option>)}</select></div>
            <div className="field"><label htmlFor="recipe-import-yield">Rendimento por lote</label><input id="recipe-import-yield" type="number" min="0.001" step="any" value={draft.yieldQuantity ?? ''} onChange={event => updateDraft({ yieldQuantity: event.target.value === '' ? null : Number(event.target.value) })} data-testid="input-import-recipe-yield"/></div>
            <div className="field"><label htmlFor="recipe-import-yield-unit">Unidade do rendimento</label><input id="recipe-import-yield-unit" value={draft.yieldUnit} onChange={event => updateDraft({ yieldUnit: event.target.value })} placeholder="unidades, fatias, potes…" data-testid="input-import-recipe-yield-unit"/></div>
          </div>

          {draft.ingredients.length > 0 && <div>
            <div className="flex items-center justify-between mb-2">
              <div><div className="eyebrow">Ingredientes reconhecidos</div><p className="text-xs text-muted-foreground mt-1">Confira a associação e as quantidades convertidas para a unidade-base.</p></div>
              <span className="pill">{draft.ingredients.length}</span>
            </div>
            <div className="space-y-2">
              {draft.ingredients.map((row, index) => {
                const compatible = ingredients.filter(item => item.baseUnit === row.unit);
                return <div key={`${row.line}-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px] items-end rounded-lg border border-border p-3" data-testid={`row-import-ingredient-${index}`}>
                  <div className="min-w-0"><div className="text-xs text-muted-foreground">No arquivo · linha {row.line}</div><div className="font-semibold text-sm truncate">{row.sourceName}</div><div className="text-xs text-muted-foreground">{row.quantity} {row.unit}</div></div>
                  <div className="field"><label htmlFor={`recipe-import-ingredient-${index}`}>Insumo cadastrado</label><select id={`recipe-import-ingredient-${index}`} value={row.ingredientId} onChange={event => updateIngredient(index, { ingredientId: event.target.value })} data-testid={`select-import-ingredient-${index}`}><option value="">Escolha um insumo</option>{compatible.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                  <div className="field"><label htmlFor={`recipe-import-quantity-${index}`}>Quantidade ({row.unit})</label><input id={`recipe-import-quantity-${index}`} type="number" min="0.001" step="any" value={row.quantity} onChange={event => updateIngredient(index, { quantity: Number(event.target.value) })} data-testid={`input-import-quantity-${index}`}/></div>
                </div>;
              })}
            </div>
            {draft.ingredients.some(row => !row.ingredientId) && <p className="text-xs text-muted-foreground mt-2" data-testid="text-import-unmatched">Os insumos precisam estar cadastrados antes de concluir. Itens com unidade incompatível não aparecem na seleção.</p>}
          </div>}
        </>}

        {error && <div className="error-note" role="alert" data-testid="text-recipe-import-error">{error}</div>}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary" onClick={close} data-testid="button-cancel-recipe-import">Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={!isReady || create.isPending || reading} data-testid="button-save-imported-recipe">
            {create.isPending ? 'Cadastrando…' : <><Check size={15}/> Cadastrar receita</>}
          </button>
        </div>
      </form>
    </section>
  </div>;
}
