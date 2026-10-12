import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Barcode as BarcodeIcon, Boxes, History, ImagePlus, Layers, LoaderCircle, MapPin, Minus, Package, Pencil, Plus, ScanLine, Search, Tag, Trash2, Wallet, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { productSchema, type LabelElement, type Product } from '@/components/label-editor/model';
import { AppShell } from '@/components/app/app-shell';
import { useSession } from '@/components/app/session';
import { rpcError, ui } from '@/components/app/i18n';
import { hasLinkColumn, openItemInEditor, type InventoryItem } from '@/lib/inventory-link';
import { BarcodeScanner, isCameraDenied } from '@/components/scan/barcode-scanner';

type Item = InventoryItem;
type SavedLabel = Pick<Database['public']['Tables']['label_products']['Row'], 'id' | 'data' | 'layout' | 'theme' | 'inventory_item_id'>;
type Movement = Database['public']['Tables']['inventory_movements']['Row'];
type ItemForm = Omit<Item, 'id' | 'created_at' | 'updated_at' | 'created_by'>;
type StockFilter = 'all' | 'in' | 'low' | 'out';
type Sort = 'newest' | 'name' | 'qty' | 'price';
type T = (typeof ui)['ar'];

const emptyForm: ItemForm = { name: '', model: '', category: '', sku: '', barcode: '', color: '', size: '', warranty: '', specs: '', location: '', notes: '', image: '', price: 0, cost: 0, quantity: 0, min_quantity: 0 };
const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(n) || 0);
const fmtDate = (d: string) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const statusOf = (i: Pick<Item, 'quantity' | 'min_quantity'>): Exclude<StockFilter, 'all'> => i.quantity <= 0 ? 'out' : i.quantity <= i.min_quantity ? 'low' : 'in';

function ean13() {
  const digits = Array.from({ length: 12 }, (_, i) => i === 0 ? 1 + Math.floor(Math.random() * 9) : Math.floor(Math.random() * 10));
  const sum = digits.reduce((s, d, i) => s + d * (i % 2 ? 3 : 1), 0);
  return digits.join('') + ((10 - (sum % 10)) % 10);
}

function readImage(file: File | undefined, t: T, done: (dataUrl: string) => void) {
  if (!file) return;
  if (file.size > 2000000 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { toast.error(t.imageTooBig); return; }
  const reader = new FileReader();
  reader.onload = () => { if (typeof reader.result === 'string') done(reader.result); };
  reader.readAsDataURL(file);
}

function StockBadge({ item, t }: { item: Pick<Item, 'quantity' | 'min_quantity'>; t: T }) {
  const s = statusOf(item);
  return <span className={`inv-badge inv-${s}`}>{s === 'out' ? t.outStock : s === 'low' ? t.lowStock : t.inStock}</span>;
}

function ItemImage({ item, className }: { item: Pick<Item, 'image' | 'name'>; className?: string }) {
  return item.image ? <img src={item.image} alt={item.name} className={className}/> : <div className={`inv-placeholder ${className ?? ''}`}><span>{item.name.trim().slice(0, 1) || '?'}</span></div>;
}

export function InventoryPage() {
  const { language, can } = useSession();
  const t = ui[language];
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [savedProds, setSavedProds] = useState<Pick<Database['public']['Tables']['label_products']['Row'], 'id' | 'name' | 'data'>[]>([]);
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState<StockFilter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [form, setForm] = useState<{ id: string | null; data: ItemForm } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [labels, setLabels] = useState<Record<string, SavedLabel>>({});
  const detail = items.find(i => i.id === detailId) ?? null;

  async function load() {
    const { data, error } = await supabase.from('inventory_items').select('*').order('updated_at', { ascending: false });
    setLoading(false);
    if (error) { toast.error(rpcError(error.message, t)); return; }
    setItems((data ?? []).map(i => ({ ...i, price: Number(i.price), cost: Number(i.cost) })));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!can('labels.design') && !can('labels.print')) return;
    void (async () => {
      if (!(await hasLinkColumn())) return;
      const { data } = await supabase.from('label_products').select('id,data,layout,theme,inventory_item_id,updated_at').not('inventory_item_id', 'is', null).order('updated_at', { ascending: false });
      const map: Record<string, SavedLabel> = {};
      for (const l of data ?? []) if (l.inventory_item_id && !map[l.inventory_item_id]) map[l.inventory_item_id] = l;
      setLabels(map);
    })();
  }, [can]);
  // Saved products not yet linked to an inventory item — offer one-click item creation.
  useEffect(() => {
    if (!can('inventory.create')) return;
    void (async () => {
      if (!(await hasLinkColumn())) return;
      const { data } = await supabase.from('label_products').select('id,name,data').is('inventory_item_id', null).order('updated_at', { ascending: false }).limit(24);
      setSavedProds(data ?? []);
    })();
  }, [can]);

  const categories = useMemo(() => [...new Set(items.map(i => i.category.trim()).filter(Boolean))].sort(), [items]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter(i =>
      (!q || [i.name, i.model, i.sku, i.barcode, i.category, i.location].some(v => v.toLowerCase().includes(q))) &&
      (!category || i.category.trim() === category) &&
      (stock === 'all' || statusOf(i) === stock));
    const sorters: Record<Sort, (a: Item, b: Item) => number> = {
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      name: (a, b) => a.name.localeCompare(b.name, language === 'ar' ? 'ar' : 'ckb'),
      qty: (a, b) => a.quantity - b.quantity,
      price: (a, b) => b.price - a.price,
    };
    return [...list].sort(sorters[sort]);
  }, [items, search, category, stock, sort, language]);
  const stats = useMemo(() => ({
    items: items.length,
    units: items.reduce((s, i) => s + i.quantity, 0),
    low: items.filter(i => statusOf(i) !== 'in').length,
    value: items.reduce((s, i) => s + i.quantity * i.price, 0),
  }), [items]);

  async function adjust(item: Item, delta: number, note = '') {
    const { data, error } = await supabase.rpc('adjust_stock', { p_item: item.id, p_delta: delta, p_note: note });
    if (error) { toast.error(rpcError(error.message, t)); return false; }
    setItems(list => list.map(i => i.id === item.id ? { ...i, quantity: data, updated_at: new Date().toISOString() } : i));
    return true;
  }

  async function createItemFromProduct(p: Pick<Database['public']['Tables']['label_products']['Row'], 'id' | 'name' | 'data'>) {
    const d = p.data as Partial<Product>;
    const payload = { name: p.name || d.name || '', model: d.model ?? '', barcode: d.barcode ?? '', image: d.image ?? '', color: d.color ?? '', size: d.size ?? '', specs: d.specs ?? '', warranty: d.warranty ?? '' };
    const { data, error } = await supabase.from('inventory_items').insert(payload).select('*').single();
    if (error) { toast.error(rpcError(error.message, t)); return; }
    await supabase.from('label_products').update({ inventory_item_id: data.id }).eq('id', p.id);
    setItems(list => [{ ...data, price: Number(data.price), cost: Number(data.cost) }, ...list]);
    setSavedProds(list => list.filter(x => x.id !== p.id));
    toast.success(t.createdLinked);
  }

  async function remove(item: Item) {
    if (!window.confirm(t.confirmDelete)) return;
    const { error } = await supabase.from('inventory_items').delete().eq('id', item.id);
    if (error) { toast.error(rpcError(error.message, t)); return; }
    setItems(list => list.filter(i => i.id !== item.id));
    setDetailId(null);
    toast.success(t.deleted);
  }

  function makeLabel(item: Item) {
    const saved = labels[item.id];
    const parsed = saved && productSchema.safeParse(saved.data);
    openItemInEditor(item, saved && parsed?.success && Array.isArray(saved.layout) ? { id: saved.id, data: parsed.data, layout: saved.layout as unknown as LabelElement[], theme: saved.theme } : undefined);
    void navigate({ to: '/' });
  }

  function openSearchMatch() {
    const q = search.trim().toLowerCase();
    const hit = q && items.find(i => i.barcode.toLowerCase() === q || i.sku.toLowerCase() === q);
    if (hit) setDetailId(hit.id);
  }

  const statCards: [ReactNode, string, string, string][] = [
    [<Boxes key="i"/>, t.statItems, fmt(stats.items), ''],
    [<Layers key="u"/>, t.statUnits, fmt(stats.units), ''],
    [<AlertTriangle key="l"/>, t.statLow, fmt(stats.low), stats.low ? 'warn' : ''],
    [<Wallet key="v"/>, t.statValue, fmt(stats.value), ''],
  ];

  return <AppShell active="inventory">
    <main className="library inv-page">
      <div className="library-top">
        <div><h1>{t.invTitle}</h1><p className="inv-subtitle">{t.invSubtitle}</p></div>
        {can('inventory.create') && <Button onClick={() => setForm({ id: null, data: { ...emptyForm } })}><Plus/>{t.addItem}</Button>}
      </div>

      <section className="inv-stats">{statCards.map(([icon, label, value, tone]) => <div key={label} className={`inv-stat ${tone}`}><div className="inv-stat-icon">{icon}</div><div><span>{label}</span><b dir="ltr">{value}</b></div></div>)}</section>

      <section className="inv-toolbar">
        <div className="inv-search"><Search size={16}/><input className="field-input" autoFocus value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') openSearchMatch(); }} placeholder={t.searchItems} aria-label={t.searchItems}/>{search && <button type="button" aria-label="clear" onClick={() => setSearch('')}><X size={14}/></button>}<button type="button" className="inv-scan-btn" aria-label={t.scan} title={t.scan} onClick={() => setScanOpen(true)}><ScanLine size={16}/></button></div>
        <select className="field-input" value={category} onChange={e => setCategory(e.target.value)} aria-label={t.category}><option value="">{t.allCategories}</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <div className="inv-chips">{(['all', 'in', 'low', 'out'] as const).map(s => <button key={s} type="button" className={`inv-chip ${stock === s ? 'active' : ''}`} onClick={() => setStock(s)}>{{ all: t.allStock, in: t.inStock, low: t.lowStock, out: t.outStock }[s]}</button>)}</div>
        <select className="field-input" value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="sort"><option value="newest">{t.sortNewest}</option><option value="name">{t.sortName}</option><option value="qty">{t.sortQtyAsc}</option><option value="price">{t.sortPriceDesc}</option></select>
      </section>

      {savedProds.length > 0 && <section className="unlinked-prods">
        <h3><Tag size={15}/>{t.unlinkedProducts}<span className="unlinked-hint">{t.unlinkedProductsHint}</span></h3>
        <div className="unlinked-row">{savedProds.map(p => { const d = p.data as Partial<Product>; return <div key={p.id} className="unlinked-card">
          {d.image ? <img src={d.image} alt={p.name}/> : <span className="unlinked-ph"><Tag size={18}/></span>}
          <div className="unlinked-info"><b>{p.name}</b><span dir="ltr">{d.model || d.barcode || '—'}</span></div>
          <Button size="sm" variant="outline" onClick={() => void createItemFromProduct(p)}><Plus size={14}/>{t.createInInventory}</Button>
        </div>; })}</div>
      </section>}

      {loading ? <div className="grid place-items-center py-24 text-muted-foreground"><LoaderCircle className="animate-spin"/></div>
        : items.length === 0 ? <div className="empty-library"><Package/><h2>{t.emptyInv}</h2><p>{t.emptyInvHint}</p>{can('inventory.create') && <Button className="mt-5" onClick={() => setForm({ id: null, data: { ...emptyForm } })}><Plus/>{t.addItem}</Button>}</div>
        : filtered.length === 0 ? <div className="empty-library"><Search/><h2>{t.noResults}</h2></div>
        : <div className="inv-grid">{filtered.map(item => <article key={item.id} className="inv-card" onClick={() => setDetailId(item.id)}>
          <div className="inv-card-media"><ItemImage item={item}/><StockBadge item={item} t={t}/>{item.category && <span className="inv-cat">{item.category}</span>}{labels[item.id] && <span className="inv-has-label" title={t.hasLabel}><Tag size={11}/>{t.hasLabel}</span>}</div>
          <div className="inv-card-body">
            <h3 title={item.name}>{item.name}</h3>
            {item.model && <p className="inv-sub" dir="ltr">{item.model}</p>}
            <div className="inv-meta" dir="ltr">{item.barcode && <span><BarcodeIcon size={12}/>{item.barcode}</span>}{item.sku && <span>SKU {item.sku}</span>}</div>
            <div className="inv-row">
              <div className="inv-price"><span>{t.price}</span><b dir="ltr">{fmt(item.price)}</b></div>
              <div className="inv-qty" onClick={e => e.stopPropagation()}>
                {can('inventory.stock') && <button type="button" aria-label={t.stockOut} disabled={item.quantity <= 0} onClick={() => adjust(item, -1)}><Minus size={13}/></button>}
                <b dir="ltr">{item.quantity}</b>
                {can('inventory.stock') && <button type="button" aria-label={t.stockIn} onClick={() => adjust(item, 1)}><Plus size={13}/></button>}
              </div>
            </div>
            <div className="inv-actions" onClick={e => e.stopPropagation()}>
              {can('inventory.edit') && <Button variant="outline" size="sm" onClick={() => setForm({ id: item.id, data: { ...item } })}><Pencil/>{t.edit}</Button>}
              {can('labels.design') && <Button variant="outline" size="sm" onClick={() => makeLabel(item)}><Tag/>{labels[item.id] ? t.openLabel : t.makeLabel}</Button>}
              {can('inventory.delete') && <Button variant="ghost" size="icon" className="inv-delete" aria-label={t.delete} title={t.delete} onClick={() => remove(item)}><Trash2/></Button>}
            </div>
          </div>
        </article>)}</div>}
    </main>

    {form && <ItemFormDialog key={form.id ?? 'new'} initial={form} categories={categories} t={t} onClose={() => setForm(null)} onSaved={item => { setItems(list => form.id ? list.map(i => i.id === item.id ? item : i) : [item, ...list]); setForm(null); }}/>}
    {detail && <ItemDetailDialog item={detail} t={t} hasLabel={!!labels[detail.id]} onClose={() => setDetailId(null)} onAdjust={adjust} onEdit={() => { setForm({ id: detail.id, data: { ...detail } }); setDetailId(null); }} onLabel={() => makeLabel(detail)} onDelete={() => remove(detail)}/>}
    {scanOpen && <Dialog open onOpenChange={open => { if (!open) setScanOpen(false); }}>
      <DialogContent dir="rtl" className="scan-dialog"><DialogHeader><DialogTitle>{t.scanTitle}</DialogTitle><DialogDescription>{t.scanHint}</DialogDescription></DialogHeader>
        <BarcodeScanner onResult={text => { setSearch(text); setScanOpen(false); toast.success(t.scanFoundShort); }} onError={err => { setScanOpen(false); toast.error(isCameraDenied(err) ? t.cameraDenied : t.cameraError); }}/>
      </DialogContent>
    </Dialog>}
  </AppShell>;
}

function ItemFormDialog({ initial, categories, t, onClose, onSaved }: { initial: { id: string | null; data: ItemForm }; categories: string[]; t: T; onClose: () => void; onSaved: (item: Item) => void }) {
  const [data, setData] = useState<ItemForm>(initial.data);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNew = !initial.id;
  const set = <K extends keyof ItemForm>(key: K, value: ItemForm[K]) => setData(d => ({ ...d, [key]: value }));
  const text = (key: keyof ItemForm & string, label: string, opts: { ltr?: boolean; max?: number; list?: string } = {}) =>
    <label className="field"><span className="field-label">{label}</span><input className="field-input" dir={opts.ltr ? 'ltr' : 'rtl'} list={opts.list} maxLength={opts.max ?? 100} value={String(data[key] ?? '')} onChange={e => set(key, e.target.value as never)}/></label>;
  const num = (key: 'price' | 'cost' | 'quantity' | 'min_quantity', label: string, disabled = false) =>
    <label className="field"><span className="field-label">{label}</span><input className="field-input" dir="ltr" type="number" min={0} step={key === 'price' || key === 'cost' ? 'any' : 1} disabled={disabled} value={data[key]} onChange={e => set(key, Math.max(0, key === 'price' || key === 'cost' ? Number(e.target.value) : Math.round(Number(e.target.value))) || 0)}/></label>;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!data.name.trim()) { toast.error(t.required); return; }
    setBusy(true);
    const clean = Object.fromEntries(Object.keys(emptyForm).map(k => [k, data[k as keyof ItemForm]])) as ItemForm;
    const { quantity, ...rest } = clean;
    const payload = { ...rest, name: data.name.trim() };
    const res = isNew
      ? await supabase.from('inventory_items').insert({ ...payload, quantity }).select('*').single()
      : await supabase.from('inventory_items').update(payload).eq('id', initial.id!).select('*').single();
    setBusy(false);
    if (res.error) { toast.error(rpcError(res.error.message, t)); return; }
    toast.success(t.saved);
    onSaved({ ...res.data, price: Number(res.data.price), cost: Number(res.data.cost) });
  }

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent dir="rtl" className="inv-dialog">
      <DialogHeader><DialogTitle>{isNew ? t.addItem : t.editItem}</DialogTitle><DialogDescription>{t.invSubtitle}</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="inv-form">
        <div className="inv-form-image">
          <ItemImage item={data} className="inv-form-preview"/>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><ImagePlus/>{data.image ? t.changeImage : t.image}</Button>
            {data.image && <Button type="button" variant="ghost" size="sm" onClick={() => set('image', '')}><X/>{t.removeImage}</Button>}
          </div>
          <input ref={fileRef} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={e => readImage(e.target.files?.[0], t, url => set('image', url))}/>
        </div>
        <div className="inv-form-grid">
          <label className="field inv-span-2"><span className="field-label">{t.name}<span className="required">*</span></span><input className="field-input" required maxLength={120} autoFocus value={data.name} onChange={e => set('name', e.target.value)}/></label>
          {text('model', t.model, { ltr: true })}
          {text('category', t.category, { max: 60, list: 'inv-categories' })}
          <datalist id="inv-categories">{categories.map(c => <option key={c} value={c}/>)}</datalist>
          <label className="field"><span className="field-label">{t.barcode}</span><div className="flex gap-2"><input className="field-input" dir="ltr" maxLength={500} value={data.barcode} onChange={e => set('barcode', e.target.value)}/><Button type="button" variant="outline" size="sm" className="h-[38px] shrink-0" onClick={() => set('barcode', ean13())}><BarcodeIcon/>{t.generate}</Button></div></label>
          {text('sku', t.sku, { ltr: true, max: 60 })}
          {num('price', t.price)}
          {num('cost', t.cost)}
          {num('quantity', t.quantity, !isNew)}
          {num('min_quantity', t.minQuantity)}
          {!isNew && <p className="inv-hint inv-span-2">{t.quantityHint}</p>}
          {text('color', t.color, { max: 60 })}
          {text('size', t.size, { max: 60 })}
          {text('warranty', t.warranty)}
          {text('location', t.location, { max: 60 })}
          <label className="field inv-span-2"><span className="field-label">{t.specs}</span><textarea className="field-input" maxLength={500} value={data.specs} onChange={e => set('specs', e.target.value)}/></label>
          <label className="field inv-span-2"><span className="field-label">{t.notes}</span><textarea className="field-input" maxLength={1000} value={data.notes} onChange={e => set('notes', e.target.value)}/></label>
        </div>
        <div className="inv-form-actions"><Button type="button" variant="outline" onClick={onClose}>{t.cancel}</Button><Button type="submit" disabled={busy}>{busy && <LoaderCircle className="animate-spin"/>}{t.save}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

function ItemDetailDialog({ item, t, hasLabel, onClose, onAdjust, onEdit, onLabel, onDelete }: { item: Item; t: T; hasLabel: boolean; onClose: () => void; onAdjust: (item: Item, delta: number, note?: string) => Promise<boolean>; onEdit: () => void; onLabel: () => void; onDelete: () => void }) {
  const { can } = useSession();
  const [moves, setMoves] = useState<Movement[] | null>(null);
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('inventory_movements').select('*').eq('item_id', item.id).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setMoves(data ?? []));
  }, [item.id, item.quantity]);

  async function run(sign: 1 | -1) {
    if (amount < 1) return;
    setBusy(true);
    const ok = await onAdjust(item, sign * amount, note.trim());
    setBusy(false);
    if (ok) { setNote(''); setAmount(1); }
  }

  const facts: [string, string, boolean?][] = ([
    [t.category, item.category], [t.sku, item.sku, true], [t.barcode, item.barcode, true], [t.color, item.color], [t.size, item.size],
    [t.warranty, item.warranty], [t.location, item.location], [t.minQuantity, String(item.min_quantity), true], [t.updated, fmtDate(item.updated_at), true],
  ] as [string, string, boolean?][]).filter(([, v]) => v);

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent dir="rtl" className="inv-dialog">
      <DialogHeader><DialogTitle>{item.name}</DialogTitle><DialogDescription dir="ltr" className="text-right">{item.model}</DialogDescription></DialogHeader>
      <div className="inv-detail">
        <div className="inv-detail-media"><ItemImage item={item}/><StockBadge item={item} t={t}/></div>
        <div className="inv-detail-info">
          <div className="inv-detail-numbers">
            <div><span>{t.quantity}</span><b dir="ltr">{item.quantity}</b></div>
            <div><span>{t.price}</span><b dir="ltr">{fmt(item.price)}</b></div>
            <div><span>{t.cost}</span><b dir="ltr">{fmt(item.cost)}</b></div>
            <div><span>{t.profit}</span><b dir="ltr" className={item.price - item.cost < 0 ? 'text-destructive' : 'text-primary'}>{fmt(item.price - item.cost)}</b></div>
          </div>
          <dl className="inv-facts">{facts.map(([k, v, ltr]) => <div key={k}><dt>{k}</dt><dd dir={ltr ? 'ltr' : undefined}>{k === t.location && <MapPin size={12}/>}{v}</dd></div>)}</dl>
          {item.specs && <p className="inv-text">{item.specs}</p>}
          {item.notes && <p className="inv-text inv-notes">{item.notes}</p>}
        </div>
      </div>

      {can('inventory.stock') && <section className="inv-adjust">
        <h4>{t.adjustStock}</h4>
        <div className="inv-adjust-row">
          <input className="field-input" dir="ltr" type="number" min={1} value={amount} onChange={e => setAmount(Math.max(1, Math.round(Number(e.target.value)) || 1))} aria-label={t.amount}/>
          <input className="field-input" maxLength={200} value={note} onChange={e => setNote(e.target.value)} placeholder={t.note} aria-label={t.note}/>
          <Button type="button" disabled={busy} onClick={() => run(1)}><ArrowDownToLine/>{t.stockIn}</Button>
          <Button type="button" variant="outline" disabled={busy || item.quantity < amount} onClick={() => run(-1)}><ArrowUpFromLine/>{t.stockOut}</Button>
        </div>
      </section>}

      <section className="inv-history">
        <h4><History size={14}/>{t.history}</h4>
        {moves === null ? <LoaderCircle className="mx-auto animate-spin text-muted-foreground"/> : moves.length === 0 ? <p className="inv-hint">{t.noHistory}</p> :
          <ul>{moves.map(m => <li key={m.id}>
            <span className={`inv-delta ${m.delta > 0 ? 'up' : m.delta < 0 ? 'down' : ''}`} dir="ltr">{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
            <span className="inv-move-note">{m.note === 'initial' ? t.initial : m.note || (m.delta > 0 ? t.stockIn : t.stockOut)}</span>
            <span className="inv-move-meta" dir="ltr">= {m.quantity_after} · {m.username ? `@${m.username} · ` : ''}{fmtDate(m.created_at)}</span>
          </li>)}</ul>}
      </section>

      <div className="inv-form-actions">
        {can('inventory.delete') && <Button variant="ghost" className="inv-delete me-auto" onClick={onDelete}><Trash2/>{t.delete}</Button>}
        {can('labels.design') && <Button variant="outline" onClick={onLabel}><Tag/>{hasLabel ? t.openLabel : t.makeLabel}</Button>}
        {can('inventory.edit') && <Button onClick={onEdit}><Pencil/>{t.edit}</Button>}
      </div>
    </DialogContent>
  </Dialog>;
}
