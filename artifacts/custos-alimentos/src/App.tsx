import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import {
  ArrowDownRight, ArrowRight, BookOpen, Boxes, Check, CircleHelp,
  ClipboardList, CookingPot, Plus, RefreshCw, Search, Trash2, Wheat, X, Pencil,
} from 'lucide-react';
import {
  getGetOverviewQueryKey, getListIngredientsQueryKey, getListProductionPlansQueryKey,
  getListRecipesQueryKey, useCreateIngredient, useCreateProductionPlan, useCreateRecipe,
  useDeleteIngredient, useDeleteRecipe, useEstimateProduction, useGetOverview,
  useListIngredients, useListProductionPlans, useListRecipes, useUpdateIngredient,
  useUpdateRecipe,
} from '@workspace/api-client-react';
import type {
  Ingredient, IngredientInput, ProductionEstimate, ProductionEstimateInput,
  ProductionPlanInput, Recipe, RecipeCategory, RecipeInput,
} from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';

const client = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1 } } });
const categories: RecipeCategory[] = ['Pães', 'Cucas', 'Quiches', 'Granola', 'Outros'];
const packUnits = ['kg', 'g', 'l', 'ml', 'un'] as const;
const fmt = (value: number | undefined) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
const num = (value: string) => Number(value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value);
const dateFmt = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const items = [
    { href: '/', label: 'Visão geral', icon: BookOpen },
    { href: '/receitas', label: 'Receitas', icon: CookingPot },
    { href: '/insumos', label: 'Insumos', icon: Boxes },
    { href: '/producao', label: 'Produção', icon: ClipboardList },
  ];
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="flex items-center gap-3 no-underline text-inherit mb-12">
        <div className="brand-mark">m</div>
        <div className="side-brand-copy"><div className="serif text-[20px] leading-none font-semibold">miolo</div><div className="text-[10px] tracking-[.17em] uppercase opacity-55 mt-1">caderno de produção</div></div>
      </Link>
      <div className="nav-caption text-[10px] uppercase tracking-[.15em] font-bold opacity-40 px-3 mb-3">Seu negócio</div>
      <nav className="flex flex-col gap-1">
        {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${location === href ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}><Icon size={17} strokeWidth={1.8}/><span>{label}</span></Link>)}
      </nav>
      <div className="sidebar-foot mt-auto px-3 pt-10">
        <div className="border-t border-white/10 pt-5 text-[11px] leading-relaxed opacity-50">Feito para quem põe a mão na massa.<br/>Custos claros, fornadas tranquilas.</div>
      </div>
    </aside>
    <main className="main-area">{children}</main>
  </div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1>{description && <p className="text-sm text-muted-foreground mt-3 max-w-xl">{description}</p>}</div>{action}</header>;
}
function LoadingPanel({ rows = 3 }: { rows?: number }) {
  return <div className="panel panel-pad space-y-4" aria-label="Carregando">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-12 w-full" />)}</div>;
}
function QueryError({ retry }: { retry: () => void }) {
  return <div className="panel empty-state"><div className="empty-mark"><CircleHelp size={21}/></div><strong className="text-foreground">Não foi possível carregar</strong><p className="text-sm mt-2 mb-5">Confira sua conexão e tente novamente.</p><button className="btn btn-secondary" onClick={retry} data-testid="button-retry"><RefreshCw size={15}/> Tentar de novo</button></div>;
}
function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-mark"><Wheat size={20}/></div><strong className="text-foreground">{title}</strong><p className="text-sm mt-2 mb-5">{text}</p>{action}</div>;
}
function Modal({ title, subtitle, close, children }: { title: string; subtitle?: string; close: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><section className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><div className="eyebrow">Caderno de produção</div><h2 className="serif text-3xl mt-1">{title}</h2>{subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}</div><button className="icon-btn" onClick={close} aria-label="Fechar"><X size={19}/></button></div>{children}</section></div>;
}
function ErrorText({ message }: { message?: string }) { return message ? <div className="error-note">{message}</div> : null; }

function OverviewPage() {
  const q = useGetOverview();
  const refresh = () => { void q.refetch(); };
  const data = q.data;
  return <div>
    <PageHeader eyebrow="Seu ateliê, em números" title="Bom dia, vamos produzir?" description="Um retrato rápido dos custos e dos planos que estão no seu caderno. A receita e os preços iniciais são exemplos: atualize-os com os valores dos seus fornecedores." action={<Link href="/producao" className="btn btn-primary no-underline"><Plus size={16}/> Planejar produção</Link>}/>
    {q.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-7">{[0,1,2,3].map(n => <div className="panel p-6" key={n}><div className="skeleton h-3 w-24 mb-5"/><div className="skeleton h-8 w-28"/></div>)}</div> : q.isError ? <QueryError retry={refresh}/> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-7">
        <Metric label="Receitas cadastradas" value={data?.recipeCount ?? 0} helper="no seu repertório"/>
        <Metric label="Insumos mapeados" value={data?.ingredientCount ?? 0} helper="com preço atualizado"/>
        <Metric label="Produtos" value={data?.productCount ?? 0} helper="por unidade de venda"/>
        <Metric label="Custo médio por unidade" value={fmt(data?.averageUnitCost)} helper="entre suas receitas" money/>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
        <section className="panel">
          <div className="p-6 border-b border-border flex justify-between items-center"><div><div className="eyebrow">Histórico recente</div><h2 className="serif text-2xl mt-1">Planos de produção</h2></div><Link href="/producao" className="text-sm font-bold text-primary no-underline flex items-center gap-1">Abrir caderno <ArrowRight size={15}/></Link></div>
          {data?.recentPlans?.length ? <div>{data.recentPlans.map(plan => <div key={plan.id} className="px-6 py-5 border-b last:border-0 border-border flex items-center justify-between gap-4" data-testid={`plan-recent-${plan.id}`}><div className="flex items-center gap-3 min-w-0"><div className="empty-mark !w-10 !h-10 !m-0 shrink-0"><ClipboardList size={17}/></div><div className="min-w-0"><div className="font-bold truncate">{plan.name}</div><div className="text-xs text-muted-foreground mt-1">{dateFmt(plan.createdAt)} <span className="mx-1">·</span> {plan.estimate.lines.length} {plan.estimate.lines.length === 1 ? 'receita' : 'receitas'}</div></div></div><div className="mono text-sm font-medium whitespace-nowrap">{fmt(plan.estimate.totalCost)}</div></div>)}</div> : <EmptyState title="Seu primeiro plano começa aqui" text="Combine receitas e descubra tudo que precisa comprar e preparar." action={<Link href="/producao" className="btn btn-primary no-underline"><Plus size={15}/> Montar plano</Link>}/>}
        </section>
        <section className="panel panel-pad overview-callout flex flex-col justify-between min-h-[250px]">
          <div><div className="text-[10px] uppercase tracking-[.16em] font-bold opacity-60">Da receita à bancada</div><h2 className="serif text-[32px] leading-tight mt-4 max-w-xs">Preço bem feito começa no detalhe.</h2><p className="text-sm opacity-70 mt-3 max-w-xs">Cadastre o valor real dos seus pacotes. O custo por grama, ml ou unidade se ajusta sozinho.</p></div>
          <Link href="/insumos" className="inline-flex items-center gap-2 font-bold text-sm mt-8 no-underline text-inherit">Revisar insumos <ArrowRight size={16}/></Link>
        </section>
      </div>
    </>}
  </div>;
}
function Metric({ label, value, helper, money }: { label: string; value: number | string; helper: string; money?: boolean }) {
  return <div className="panel metric"><div className="eyebrow">{label}</div><div className={`metric-value ${money ? 'mono !text-[27px] !mt-[18px]' : ''}`} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</div><div className="text-xs text-muted-foreground">{helper}</div></div>;
}

function IngredientDialog({ item, close }: { item?: Ingredient; close: () => void }) {
  const qc = useQueryClient();
  const create = useCreateIngredient();
  const update = useUpdateIngredient();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: item?.name ?? '', category: item?.category ?? '', packQuantity: item?.packQuantity?.toString() ?? '', packUnit: item?.packUnit ?? 'kg', packPrice: item?.packPrice?.toString() ?? '' });
  const pending = create.isPending || update.isPending;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const payload: IngredientInput = { name: form.name.trim(), category: form.category.trim(), packQuantity: num(form.packQuantity), packUnit: form.packUnit, packPrice: num(form.packPrice) };
    const done = { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListIngredientsQueryKey() }); void qc.invalidateQueries({ queryKey: getListRecipesQueryKey() }); void qc.invalidateQueries({ queryKey: getGetOverviewQueryKey() }); close(); }, onError: () => setError('Não foi possível salvar o insumo. Verifique os dados e tente novamente.') };
    item ? update.mutate({ id: item.id, data: payload }, done) : create.mutate({ data: payload }, done);
  };
  return <Modal title={item ? 'Editar insumo' : 'Novo insumo'} subtitle="O custo-base é calculado a partir do pacote informado." close={close}><form onSubmit={submit} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Nome do insumo"><input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Ex.: farinha de trigo" data-testid="input-ingredient-name"/></Field><Field label="Categoria"><input required value={form.category} onChange={e => setForm({...form,category:e.target.value})} placeholder="Ex.: secos, laticínios" data-testid="input-ingredient-category"/></Field></div>
    <div className="grid gap-4 sm:grid-cols-3"><Field label="Quantidade do pacote"><input required type="number" min="0.001" step="any" value={form.packQuantity} onChange={e => setForm({...form,packQuantity:e.target.value})} placeholder="1" data-testid="input-pack-quantity"/></Field><Field label="Unidade do pacote"><select value={form.packUnit} onChange={e => setForm({...form,packUnit:e.target.value as typeof packUnits[number]})} data-testid="select-pack-unit">{packUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></Field><Field label="Preço pago (R$)"><input required type="number" min="0" step="0.01" value={form.packPrice} onChange={e => setForm({...form,packPrice:e.target.value})} placeholder="0,00" data-testid="input-pack-price"/></Field></div>
    <ErrorText message={error}/><div className="flex justify-end gap-2 pt-3"><button type="button" className="btn btn-secondary" onClick={close}>Cancelar</button><button disabled={pending} className="btn btn-primary" data-testid="button-save-ingredient">{pending ? 'Salvando…' : item ? 'Salvar alterações' : 'Cadastrar insumo'}</button></div>
  </form></Modal>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }

function IngredientsPage() {
  const q = useListIngredients(); const qc = useQueryClient(); const del = useDeleteIngredient();
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState<Ingredient>(); const [search, setSearch] = useState(''); const [error, setError] = useState('');
  const items = (q.data ?? []).filter(x => `${x.name} ${x.category}`.toLowerCase().includes(search.toLowerCase()));
  const openNew = () => { setEditing(undefined); setModal(true); };
  const remove = (item: Ingredient) => { if (window.confirm(`Excluir "${item.name}"? Esta ação não pode ser desfeita.`)) del.mutate({ id: item.id }, { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListIngredientsQueryKey() }); void qc.invalidateQueries({ queryKey: getListRecipesQueryKey() }); void qc.invalidateQueries({ queryKey: getGetOverviewQueryKey() }); setError(''); }, onError: () => setError('Este insumo não pode ser excluído enquanto estiver ligado a uma receita.') }); };
  return <div><PageHeader eyebrow="Base de custos" title="Insumos" description="Registre o preço do pacote. Cada receita usa o custo proporcional à quantidade." action={<button className="btn btn-primary" onClick={openNew} data-testid="button-add-ingredient"><Plus size={16}/> Novo insumo</button>}/>
    {error && <ErrorText message={error}/>}
    <div className="panel">
      <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-4"><div><div className="eyebrow">Sua despensa</div><div className="text-sm mt-1 text-muted-foreground">{q.data?.length ?? 0} insumos cadastrados</div></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16}/><input aria-label="Buscar insumos" className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus:border-primary" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar insumo…" data-testid="input-search-ingredients"/></div></div>
      {q.isLoading ? <div className="p-5"><LoadingPanel rows={4}/></div> : q.isError ? <QueryError retry={() => void q.refetch()}/> : items.length === 0 ? <EmptyState title={search ? 'Nada por aqui' : 'Sua despensa está vazia'} text={search ? 'Tente outro nome ou categoria.' : 'Cadastre os ingredientes que entram nas suas receitas.'} action={!search && <button className="btn btn-primary" onClick={openNew}><Plus size={15}/> Cadastrar primeiro insumo</button>}/> :
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Insumo</th><th>Categoria</th><th>Pacote</th><th>Preço do pacote</th><th>Custo-base</th><th></th></tr></thead><tbody>{items.map(item => <tr key={item.id} data-testid={`row-ingredient-${item.id}`}><td><div className="font-bold">{item.name}</div></td><td><span className="pill">{item.category}</span></td><td className="mono">{item.packQuantity} {item.packUnit}</td><td className="mono">{fmt(item.packPrice)}</td><td className="mono font-medium">{fmt(item.baseUnitCost)} <span className="text-muted-foreground">/{item.baseUnit}</span></td><td><div className="flex justify-end gap-1"><button className="icon-btn" aria-label={`Editar ${item.name}`} onClick={() => {setEditing(item);setModal(true);}} data-testid={`button-edit-ingredient-${item.id}`}><Pencil size={15}/></button><button className="icon-btn hover:!text-destructive" aria-label={`Excluir ${item.name}`} onClick={() => remove(item)} disabled={del.isPending} data-testid={`button-delete-ingredient-${item.id}`}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}
    </div>{modal && <IngredientDialog item={editing} close={() => setModal(false)}/>}
  </div>;
}

type DraftRow = { ingredientId: string; quantity: string };
function RecipeDialog({ item, ingredients, close }: { item?: Recipe; ingredients: Ingredient[]; close: () => void }) {
  const qc=useQueryClient(); const create=useCreateRecipe(); const update=useUpdateRecipe(); const [error,setError]=useState('');
  const [name,setName]=useState(item?.name ?? ''); const [category,setCategory]=useState<RecipeCategory>(item?.category ?? 'Pães'); const [yieldQuantity,setYieldQuantity]=useState(item?.yieldQuantity?.toString() ?? ''); const [yieldUnit,setYieldUnit]=useState(item?.yieldUnit ?? 'un');
  const [rows,setRows]=useState<DraftRow[]>(item?.ingredients.map(x=>({ingredientId:String(x.ingredientId),quantity:String(x.quantity)})) ?? [{ingredientId:'',quantity:''}]);
  const pending=create.isPending||update.isPending;
  const patchRow=(index:number,patch:Partial<DraftRow>)=>setRows(rows.map((r,i)=>i===index?{...r,...patch}:r));
  const submit=(e:FormEvent)=>{e.preventDefault();const payload:RecipeInput={name:name.trim(),category,yieldQuantity:num(yieldQuantity),yieldUnit:yieldUnit.trim(),ingredients:rows.filter(r=>r.ingredientId&&r.quantity).map(r=>({ingredientId:Number(r.ingredientId),quantity:num(r.quantity)}))};if(!payload.ingredients.length){setError('Adicione ao menos um insumo à receita.');return;}const done={onSuccess:()=>{void qc.invalidateQueries({queryKey:getListRecipesQueryKey()});void qc.invalidateQueries({queryKey:getGetOverviewQueryKey()});close();},onError:()=>setError('Não foi possível salvar a receita. Confira os dados e os insumos selecionados.')};item?update.mutate({id:item.id,data:payload},done):create.mutate({data:payload},done);};
  return <Modal title={item?'Editar receita':'Nova receita'} subtitle="A composição atualiza automaticamente o custo do lote e de cada unidade." close={close}><form onSubmit={submit} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Nome da receita"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: pão de fermentação natural" data-testid="input-recipe-name"/></Field><Field label="Categoria"><select value={category} onChange={e=>setCategory(e.target.value as RecipeCategory)} data-testid="select-recipe-category">{categories.map(c=><option key={c}>{c}</option>)}</select></Field></div>
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr]"><Field label="Rendimento por lote"><input required type="number" step="any" min="0.001" value={yieldQuantity} onChange={e=>setYieldQuantity(e.target.value)} placeholder="Ex.: 12" data-testid="input-recipe-yield"/></Field><Field label="Unidade de rendimento"><input required value={yieldUnit} onChange={e=>setYieldUnit(e.target.value)} placeholder="un, fatias, potes…" data-testid="input-recipe-yield-unit"/></Field></div>
    <div><div className="flex justify-between items-center mb-2"><div><div className="eyebrow">Composição</div><div className="text-sm font-bold mt-1">Insumos e quantidades</div></div><button type="button" className="btn btn-secondary !py-2 !px-3" onClick={()=>setRows([...rows,{ingredientId:'',quantity:''}])} data-testid="button-add-recipe-ingredient"><Plus size={14}/> Adicionar linha</button></div>
      {rows.map((row,i)=><div className="grid grid-cols-[1fr_120px_36px] gap-2 mb-2" key={i}><select aria-label="Insumo" className="h-[42px] min-w-0 rounded-md border border-input bg-card px-3 text-sm" value={row.ingredientId} onChange={e=>patchRow(i,{ingredientId:e.target.value})} data-testid={`select-recipe-ingredient-${i}`}><option value="">Escolha um insumo</option>{ingredients.map(ing=><option key={ing.id} value={ing.id}>{ing.name} ({ing.baseUnit})</option>)}</select><input aria-label="Quantidade" type="number" step="any" min="0.001" placeholder="Qtd." className="h-[42px] w-full rounded-md border border-input bg-card px-3 text-sm" value={row.quantity} onChange={e=>patchRow(i,{quantity:e.target.value})} data-testid={`input-recipe-quantity-${i}`}/><button type="button" className="icon-btn" aria-label="Remover linha" disabled={rows.length===1} onClick={()=>setRows(rows.filter((_,j)=>j!==i))}><X size={15}/></button></div>)}
    </div><ErrorText message={error}/><div className="flex justify-end gap-2 pt-2"><button type="button" className="btn btn-secondary" onClick={close}>Cancelar</button><button disabled={pending||!ingredients.length} className="btn btn-primary" data-testid="button-save-recipe">{pending?'Salvando…':item?'Salvar alterações':'Cadastrar receita'}</button></div>
  </form></Modal>;
}

function RecipesPage() {
  const q=useListRecipes();const ing=useListIngredients();const qc=useQueryClient();const del=useDeleteRecipe();
  const [modal,setModal]=useState(false);const [editing,setEditing]=useState<Recipe>();const [search,setSearch]=useState('');const [category,setCategory]=useState('Todas');const [error,setError]=useState('');
  const recipes=(q.data??[]).filter(r=>(category==='Todas'||r.category===category)&&r.name.toLowerCase().includes(search.toLowerCase()));
  const openNew=()=>{setEditing(undefined);setModal(true);};
  const remove=(r:Recipe)=>{if(window.confirm(`Excluir a receita "${r.name}"?`))del.mutate({id:r.id},{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListRecipesQueryKey()});void qc.invalidateQueries({queryKey:getGetOverviewQueryKey()});},onError:()=>setError('Não foi possível excluir esta receita.')});};
  return <div><PageHeader eyebrow="Seu repertório" title="Receitas" description="Custos calculados a partir dos insumos e do rendimento de cada lote." action={<button className="btn btn-primary" onClick={openNew} data-testid="button-add-recipe"><Plus size={16}/> Nova receita</button>}/>
    {error&&<ErrorText message={error}/>}
    <div className="panel"><div className="p-5 border-b border-border flex flex-wrap gap-4 justify-between items-center"><div><div className="eyebrow">Caderno de receitas</div><div className="text-sm text-muted-foreground mt-1">{q.data?.length??0} receitas</div></div><div className="flex flex-wrap gap-2"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input aria-label="Buscar receitas" className="h-10 w-full sm:w-52 rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus:border-primary" placeholder="Buscar receita…" value={search} onChange={e=>setSearch(e.target.value)} data-testid="input-search-recipes"/></div><select className="h-10 rounded-lg border border-input bg-card px-3 text-sm" value={category} onChange={e=>setCategory(e.target.value)} data-testid="filter-recipe-category"><option>Todas</option>{categories.map(c=><option key={c}>{c}</option>)}</select></div></div>
      {q.isLoading||ing.isLoading?<div className="p-5"><LoadingPanel rows={4}/></div>:q.isError||ing.isError?<QueryError retry={()=>{void q.refetch();void ing.refetch();}}/>:recipes.length===0?<EmptyState title={search||category!=='Todas'?'Nenhuma receita encontrada':'Seu caderno está em branco'} text={search||category!=='Todas'?'Ajuste os filtros e tente novamente.':'Cadastre uma receita para conhecer seu custo real por unidade.'} action={!search&&category==='Todas'&&<button className="btn btn-primary" onClick={openNew}><Plus size={15}/> Criar primeira receita</button>}/>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Receita</th><th>Categoria</th><th>Rendimento</th><th>Custo do lote</th><th>Custo por unidade</th><th>Atualizada</th><th></th></tr></thead><tbody>{recipes.map(r=><tr key={r.id} data-testid={`row-recipe-${r.id}`}><td className="font-bold">{r.name}</td><td><span className="pill">{r.category}</span></td><td className="mono">{r.yieldQuantity} {r.yieldUnit}</td><td className="mono">{fmt(r.batchCost)}</td><td className="mono font-bold">{fmt(r.unitCost)} <span className="text-muted-foreground font-normal">/ {r.yieldUnit.replace(/s$/,'')}</span></td><td className="text-muted-foreground">{dateFmt(r.updatedAt)}</td><td><div className="flex justify-end gap-1"><button className="icon-btn" aria-label={`Editar ${r.name}`} onClick={()=>{setEditing(r);setModal(true);}} data-testid={`button-edit-recipe-${r.id}`}><Pencil size={15}/></button><button className="icon-btn hover:!text-destructive" aria-label={`Excluir ${r.name}`} onClick={()=>remove(r)} disabled={del.isPending} data-testid={`button-delete-recipe-${r.id}`}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}
    </div>{modal&&<RecipeDialog item={editing} ingredients={ing.data??[]} close={()=>setModal(false)}/>}
  </div>;
}

function ProductionPage() {
  const recipesQ=useListRecipes(); const plansQ=useListProductionPlans(); const estimateMutation=useEstimateProduction(); const createPlan=useCreateProductionPlan(); const qc=useQueryClient();
  const [rows,setRows]=useState<DraftRow[]>([{ingredientId:'',quantity:'1'}]); const [estimate,setEstimate]=useState<ProductionEstimate>(); const [name,setName]=useState(''); const [error,setError]=useState(''); const [saved,setSaved]=useState(false);
  const recipes=recipesQ.data??[];
  const patchRow=(i:number,patch:Partial<DraftRow>)=>{setRows(rows.map((r,j)=>j===i?{...r,...patch}:r));setEstimate(undefined);setSaved(false);};
  const productionLines=()=>rows.filter(r=>r.ingredientId&&r.quantity&&num(r.quantity)>0).map(r=>({recipeId:Number(r.ingredientId),quantity:num(r.quantity)}));
  const runEstimate=()=>{const lines=productionLines();if(!lines.length){setError('Adicione ao menos uma receita e informe uma quantidade.');return;}setError('');estimateMutation.mutate({data:{lines} as ProductionEstimateInput},{onSuccess:result=>{setEstimate(result);setSaved(false);},onError:()=>setError('Não foi possível calcular este plano. Revise as quantidades e tente novamente.')});};
  const save=()=>{const lines=productionLines();if(!estimate||!name.trim()||!lines.length)return;const payload:ProductionPlanInput={name:name.trim(),lines};createPlan.mutate({data:payload},{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListProductionPlansQueryKey()});void qc.invalidateQueries({queryKey:getGetOverviewQueryKey()});setSaved(true);setName('');},onError:()=>setError('Não foi possível salvar o plano. Tente novamente.')});};
  const plans=plansQ.data??[];
  return <div><PageHeader eyebrow="Da bancada às compras" title="Planejar produção" description="Informe quantas unidades deseja produzir. O Miolo escala cada receita e soma as quantidades e os custos em uma lista só."/>
    <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr] items-start">
      <section className="panel panel-pad"><div className="flex items-start justify-between gap-3 mb-6"><div><div className="eyebrow">01 / Monte sua fornada</div><h2 className="serif text-2xl mt-1">O que vai sair do forno?</h2></div><div className="empty-mark !m-0"><CookingPot size={19}/></div></div>
        {recipesQ.isLoading?<LoadingPanel rows={3}/>:recipesQ.isError?<QueryError retry={()=>void recipesQ.refetch()}/>:!recipes.length?<EmptyState title="Sem receitas para planejar" text="Cadastre receitas antes de montar uma produção." action={<Link href="/receitas" className="btn btn-primary no-underline">Ir para receitas <ArrowRight size={15}/></Link>}/>:<div className="space-y-3">
          {rows.map((row,i)=>{const recipe=recipes.find(r=>r.id===Number(row.ingredientId));return <div key={i} className="production-line items-end"><Field label={i===0?'Receita':''}><select value={row.ingredientId} onChange={e=>patchRow(i,{ingredientId:e.target.value})} data-testid={`select-production-recipe-${i}`}><option value="">Escolha uma receita</option>{recipes.map(r=><option key={r.id} value={r.id}>{r.name} · {r.yieldQuantity} {r.yieldUnit}</option>)}</select></Field><Field label={i===0?`Quantidade (${recipe?.yieldUnit??'unidades'})`:''}><input type="number" min="0.01" step="any" value={row.quantity} onChange={e=>patchRow(i,{quantity:e.target.value})} data-testid={`input-production-quantity-${i}`}/></Field><button className="icon-btn mb-1" type="button" aria-label="Remover receita" disabled={rows.length===1} onClick={()=>{setRows(rows.filter((_,j)=>j!==i));setEstimate(undefined);}}><X size={15}/></button></div>})}
          <button className="btn btn-secondary !py-2" onClick={()=>setRows([...rows,{ingredientId:'',quantity:'1'}])} data-testid="button-add-production-line"><Plus size={14}/> Adicionar receita</button>
          <ErrorText message={error}/>
          {saved&&<div className="rounded-lg bg-secondary px-4 py-3 text-sm flex gap-2 items-center"><Check size={16} className="text-primary"/> Plano salvo no caderno de produção.</div>}
          <button className="btn btn-primary w-full mt-2" onClick={runEstimate} disabled={estimateMutation.isPending} data-testid="button-estimate-production">{estimateMutation.isPending?'Calculando…':<><ArrowDownRight size={16}/> Calcular compras e custos</>}</button>
        </div>}
      </section>
      <section className="space-y-5">
        <div className="panel overflow-hidden">
          <div className="p-5 border-b border-border"><div className="eyebrow">02 / Sua lista consolidada</div><h2 className="serif text-2xl mt-1">Separar e comprar</h2></div>
          {estimate ? <><div className="px-5 py-4 bg-secondary/60 flex items-center justify-between"><span className="text-sm font-bold">Custo estimado da produção</span><strong className="mono text-lg">{fmt(estimate.totalCost)}</strong></div>
            <div className="p-5"><div className="eyebrow mb-3">Receitas planejadas</div><div className="space-y-3 mb-6">{estimate.lines.map((line,i)=>{const recipe=recipes.find(r=>r.id===line.recipeId);const batchCount=recipe?line.quantity/recipe.yieldQuantity:0;return <div key={`${line.recipeId}-${i}`} className="flex items-center justify-between gap-3 text-sm" data-testid={`estimate-line-${line.recipeId}`}><div className="min-w-0"><div className="font-bold truncate">{line.recipeName}</div><div className="text-xs text-muted-foreground">{line.quantity} {line.yieldUnit} · {batchCount.toLocaleString('pt-BR',{maximumFractionDigits:2})} lote(s) · {fmt(line.batchCost)} por lote</div></div><span className="mono whitespace-nowrap">{fmt(line.totalCost)}</span></div>})}</div>
              <div className="eyebrow mb-3">Insumos totais</div>{estimate.ingredients.length?<div className="divide-y divide-border">{estimate.ingredients.map((line,i)=><div key={`${line.ingredientId}-${i}`} className="py-3 flex items-center justify-between gap-3" data-testid={`estimate-ingredient-${line.ingredientId}`}><div className="text-sm font-semibold">{line.name}<div className="text-xs font-normal text-muted-foreground mt-1">{fmt(line.totalCost)}</div></div><div className="mono font-medium text-sm whitespace-nowrap">{line.quantity} {line.unit}</div></div>)}</div>:<div className="text-sm text-muted-foreground">Nenhum insumo informado.</div>}
              <div className="mt-5 pt-4 border-t border-border"><Field label="Nome deste plano"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Fornada de sábado" data-testid="input-plan-name"/></Field><button className="btn btn-primary w-full mt-3" onClick={save} disabled={!name.trim()||createPlan.isPending||saved} data-testid="button-save-plan"><Check size={15}/>{createPlan.isPending?'Salvando…':saved?'Plano salvo':'Salvar plano'}</button></div>
            </div></>:<EmptyState title="A lista aparece por aqui" text="Escolha as receitas e quantas unidades deseja produzir. Depois, calcule a produção para consolidar cada insumo."/>}
        </div>
        <div className="panel"><div className="p-5 border-b border-border flex items-center justify-between"><div><div className="eyebrow">Arquivo</div><h3 className="serif text-xl mt-1">Planos salvos</h3></div><span className="pill">{plans.length}</span></div>
          {plansQ.isLoading?<div className="p-5"><LoadingPanel rows={2}/></div>:plansQ.isError?<div className="p-4"><QueryError retry={()=>void plansQ.refetch()}/></div>:plans.length?<div>{plans.slice(0,5).map(plan=><div key={plan.id} className="px-5 py-4 flex items-center justify-between gap-3 border-b last:border-0 border-border" data-testid={`saved-plan-${plan.id}`}><div className="min-w-0"><div className="text-sm font-bold truncate">{plan.name}</div><div className="text-xs text-muted-foreground mt-1">{dateFmt(plan.createdAt)} · {plan.estimate.lines.length} receitas</div></div><span className="mono text-sm whitespace-nowrap">{fmt(plan.estimate.totalCost)}</span></div>)}</div>:<div className="px-5 py-6 text-sm text-muted-foreground">Seus planos salvos aparecerão aqui.</div>}
        </div>
      </section>
    </div>
  </div>;
}

function Router() {
  return <Shell><Switch>
    <Route path="/" component={OverviewPage}/>
    <Route path="/receitas" component={RecipesPage}/>
    <Route path="/insumos" component={IngredientsPage}/>
    <Route path="/producao" component={ProductionPage}/>
    <Route component={NotFound}/>
  </Switch></Shell>;
}
function App() {
  return <QueryClientProvider client={client}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/></WouterRouter></QueryClientProvider>;
}
export default App;
