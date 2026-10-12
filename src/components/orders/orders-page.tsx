import { useEffect, useMemo, useState } from 'react';
import { CheckCheck, LoaderCircle, Minus, Package, Pencil, Play, Plus, ReceiptText, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { AppShell } from '@/components/app/app-shell';
import { useSession } from '@/components/app/session';
import { rpcError, ui } from '@/components/app/i18n';
import type { InventoryItem } from '@/lib/inventory-link';
import type { Product } from '@/components/label-editor/model';

type Order = Database['public']['Tables']['orders']['Row'];
type SavedProd = Pick<Database['public']['Tables']['label_products']['Row'], 'id' | 'name' | 'data' | 'theme'> & { inventory_item_id?: string | null };
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Status = Order['status'];
type CartLine = { key: string; itemId: string | null; name: string; price: number; qty: number };

const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(n) || 0);
const fmtDate = (d: string) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const statusLabel = (s: Status, t: (typeof ui)['ar']) => ({ new: t.statusNew, preparing: t.statusPreparing, done: t.statusDone, cancelled: t.statusCancelled })[s];
const isMissingTable = (m?: string) => !!m && (m.includes('does not exist') || m.includes('relation') || m.includes('schema cache') || m.includes('Could not find'));

export function OrdersPage() {
  const { language, can, user } = useSession();
  const t = ui[language];
  const [orders, setOrders] = useState<Order[]>([]);
  const [lines, setLines] = useState<Record<string, OrderItem[]>>({});
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [savedProds, setSavedProds] = useState<SavedProd[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [composer, setComposer] = useState<null | { order: Order | null }>(null);
  const [customer, setCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Status>('new');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: o, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(300);
    if (error) { setLoading(false); if (isMissingTable(error.message)) setMissing(true); else toast.error(rpcError(error.message, t)); return; }
    setOrders(o ?? []);
    const ids = (o ?? []).map(x => x.id);
    if (ids.length) {
      const { data: it } = await supabase.from('order_items').select('*').in('order_id', ids);
      const map: Record<string, OrderItem[]> = {};
      for (const l of it ?? []) (map[l.order_id] ??= []).push(l);
      setLines(map);
    } else setLines({});
    setLoading(false);
  }

  useEffect(() => { setLoading(true); void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Product catalogue for the order composer: inventory items plus saved products not linked to one.
  useEffect(() => {
    if (!composer) return;
    if (can('inventory.view')) void supabase.from('inventory_items').select('*').order('name').limit(400).then(({ data }) => setProducts(data ?? []));
    void (async () => {
      const { data, error } = await supabase.from('label_products').select('id,name,data,theme,inventory_item_id').order('updated_at', { ascending: false }).limit(200);
      if (!error) { setSavedProds((data ?? []) as SavedProd[]); return; }
      const res = await supabase.from('label_products').select('id,name,data,theme').order('updated_at', { ascending: false }).limit(200);
      setSavedProds((res.data ?? []).map(p => ({ ...p, inventory_item_id: null })) as SavedProd[]);
    })();
  }, [composer, can]);

  const filtered = useMemo(() => filter === 'all' ? orders : orders.filter(o => o.status === filter), [orders, filter]);
  const prodFiltered = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => [p.name, p.model, p.barcode, p.sku, p.category].some(v => v?.toLowerCase().includes(q)));
  }, [products, prodSearch]);
  const savedFiltered = useMemo(() => {
    const linked = new Set(products.map(p => p.id));
    const q = prodSearch.trim().toLowerCase();
    return savedProds.filter(p => {
      if (p.inventory_item_id && linked.has(p.inventory_item_id)) return false;
      if (!q) return true;
      const d = p.data as Partial<Product>;
      return [p.name, d.model, d.barcode].some(v => typeof v === 'string' && v.toLowerCase().includes(q));
    });
  }, [savedProds, products, prodSearch]);
  const total = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const counts = useMemo(() => orders.reduce((m, o) => ({ ...m, [o.status]: (m[o.status] ?? 0) + 1 }), {} as Record<string, number>), [orders]);

  function openComposer(order: Order | null) {
    if (order) {
      setCustomer(order.customer_name); setNotes(order.notes); setStatus(order.status);
      setCart((lines[order.id] ?? []).map(l => ({ key: l.id, itemId: l.inventory_item_id, name: l.name, price: Number(l.price), qty: l.quantity })));
      setRemovedIds([]);
    } else {
      setCustomer(''); setNotes(''); setStatus('new'); setCart([]); setRemovedIds([]);
    }
    setProdSearch('');
    setComposer({ order });
  }

  function addLine(p: InventoryItem) {
    setCart(c => {
      const hit = c.find(l => l.itemId === p.id);
      if (hit) return c.map(l => l.itemId === p.id ? { ...l, qty: l.qty + 1 } : l);
      return [...c, { key: `new-${p.id}`, itemId: p.id, name: p.name, price: Number(p.price), qty: 1 }];
    });
  }
  function addSavedLine(p: SavedProd) {
    const d = p.data as Partial<Product>;
    const name = p.name || d.name || '';
    setCart(c => [...c, { key: `prod-${p.id}-${Date.now()}`, itemId: null, name, price: 0, qty: 1 }]);
  }
  const setQty = (key: string, qty: number) => setCart(c => qty <= 0 ? c.filter(l => l.key !== key) : c.map(l => l.key === key ? { ...l, qty } : l));
  const setPrice = (key: string, price: number) => setCart(c => c.map(l => l.key === key ? { ...l, price: Math.max(0, price) } : l));
  const removeLine = (key: string) => {
    const line = cart.find(l => l.key === key);
    if (line && !key.startsWith('new-')) setRemovedIds(r => [...r, line.key]);
    setCart(c => c.filter(l => l.key !== key));
  };

  async function submit() {
    if (!customer.trim()) { toast.error(t.customerRequired); return; }
    if (!cart.length) { toast.error(t.cartEmpty); return; }
    setBusy(true);
    const editing = composer?.order ?? null;
    if (editing) {
      const { error } = await supabase.from('orders').update({ customer_name: customer.trim(), notes: notes.trim(), status, total }).eq('id', editing.id);
      if (error) { setBusy(false); toast.error(rpcError(error.message, t)); return; }
      if (removedIds.length) {
        const { error: de } = await supabase.from('order_items').delete().in('id', removedIds);
        if (de) { setBusy(false); toast.error(rpcError(de.message, t)); return; }
      }
      for (const l of cart) {
        const { error: le } = l.key.startsWith('new-')
          ? await supabase.from('order_items').insert({ order_id: editing.id, inventory_item_id: l.itemId, name: l.name, quantity: l.qty, price: l.price })
          : await supabase.from('order_items').update({ quantity: l.qty, price: l.price, name: l.name }).eq('id', l.key);
        if (le) { setBusy(false); toast.error(rpcError(le.message, t)); return; }
      }
      setBusy(false);
      toast.success(t.orderUpdated); setComposer(null); void load(); return;
    }
    const { data, error } = await supabase.from('orders').insert({ customer_name: customer.trim(), notes: notes.trim(), total }).select('id').single();
    if (error) { setBusy(false); toast.error(rpcError(error.message, t)); return; }
    const { error: e2 } = await supabase.from('order_items').insert(cart.map(l => ({ order_id: data.id, inventory_item_id: l.itemId, name: l.name, quantity: l.qty, price: l.price })));
    setBusy(false);
    if (e2) { toast.error(rpcError(e2.message, t)); return; }
    toast.success(t.orderSaved); setComposer(null); void load();
  }

  async function setOrderStatus(o: Order, s: Status) {
    const { error } = await supabase.from('orders').update({ status: s }).eq('id', o.id);
    if (error) { toast.error(rpcError(error.message, t)); return; }
    setOrders(os => os.map(x => x.id === o.id ? { ...x, status: s } : x));
  }
  async function removeOrder(o: Order) {
    if (!window.confirm(t.confirmDeleteOrder)) return;
    const { error } = await supabase.from('orders').delete().eq('id', o.id);
    if (error) { toast.error(rpcError(error.message, t)); return; }
    setOrders(os => os.filter(x => x.id !== o.id)); toast.success(t.deleted);
  }

  const statusFilters: { key: 'all' | Status; label: string }[] = [
    { key: 'all', label: t.allOrders }, { key: 'new', label: t.statusNew }, { key: 'preparing', label: t.statusPreparing },
    { key: 'done', label: t.statusDone }, { key: 'cancelled', label: t.statusCancelled },
  ];

  return <AppShell active="orders">
    <main className="orders-page">
      <div className="library-top">
        <div><h1>{t.ordersTitle}</h1><p className="orders-sub">{t.ordersSubtitle}</p></div>
        {can('orders.create') && <Button onClick={() => openComposer(null)}><Plus/>{t.newOrder}</Button>}
      </div>
      <div className="orders-filters">{statusFilters.map(f => <button key={f.key} className={`order-chip ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>{f.label}{f.key !== 'all' && counts[f.key] ? <b>{counts[f.key]}</b> : null}</button>)}</div>
      {missing ? <div className="empty-library"><Package/><h2>{t.setupNeeded}</h2><p>{t.setupHint}</p></div>
        : loading ? <div className="empty-library"><LoaderCircle className="animate-spin"/></div>
        : filtered.length === 0 ? <div className="empty-library"><ReceiptText/><h2>{t.emptyOrders}</h2><p>{t.emptyOrdersHint}</p>{can('orders.create') && <Button className="mt-5" onClick={() => openComposer(null)}><Plus/>{t.newOrder}</Button>}</div>
        : <div className="orders-grid">{filtered.map(o => {
          const ls = lines[o.id] ?? [];
          return <article key={o.id} className={`order-card st-${o.status}`}>
            <div className="order-card-top">
              <span className="order-num">{t.orderNo} #{o.id.slice(0, 6)}</span>
              <span className={`order-status st-${o.status}`}>{statusLabel(o.status, t)}</span>
            </div>
            <h2 className="order-customer">{o.customer_name || '—'}</h2>
            <p className="order-meta"><span>{t.orderBy} {o.username || '—'}</span><span dir="ltr">{fmtDate(o.created_at)}</span></p>
            <div className="order-lines">
              {ls.slice(0, 4).map(l => <div key={l.id} className="order-line"><span>{l.name} <b>×{l.quantity}</b></span><span dir="ltr">{fmt(l.price * l.quantity)}</span></div>)}
              {ls.length > 4 && <div className="order-line text-muted-foreground">+{ls.length - 4} {t.itemsCount}</div>}
              {o.notes && <p className="order-notes">{o.notes}</p>}
            </div>
            <div className="order-card-foot">
              <b className="order-total" dir="ltr">{fmt(o.total)}</b>
              <div className="order-actions">
                {can('orders.update') && o.status === 'new' && <Button size="sm" variant="outline" onClick={() => setOrderStatus(o, 'preparing')}><Play/>{t.startPreparing}</Button>}
                {can('orders.update') && o.status === 'preparing' && <Button size="sm" variant="outline" onClick={() => setOrderStatus(o, 'done')}><CheckCheck/>{t.markDone}</Button>}
                {can('orders.update') && o.status !== 'done' && o.status !== 'cancelled' && <Button size="sm" variant="ghost" onClick={() => setOrderStatus(o, 'cancelled')}>{t.cancelOrder}</Button>}
                {can('orders.update') && <Button size="icon" variant="ghost" aria-label={t.edit} title={t.edit} onClick={() => openComposer(o)}><Pencil/></Button>}
                {can('orders.delete') && <Button size="icon" variant="ghost" aria-label={t.delete} title={t.delete} onClick={() => removeOrder(o)}><Trash2/></Button>}
              </div>
            </div>
          </article>;
        })}</div>}
    </main>

    <Dialog open={!!composer} onOpenChange={open => { if (!open) setComposer(null); }}>
      <DialogContent dir="rtl" className="order-dialog">
        <DialogHeader><DialogTitle>{composer?.order ? t.editOrder : t.newOrder}</DialogTitle><DialogDescription>{t.ordersSubtitle}</DialogDescription></DialogHeader>
        <div className="order-form-top">
          <label className="field order-customer-field"><span className="field-label">{t.customerName} <span className="required">*</span></span><input className="field-input" autoFocus maxLength={120} value={customer} onChange={e => setCustomer(e.target.value)} placeholder={t.customerName}/></label>
          {composer?.order && can('orders.update') && <label className="field order-status-field"><span className="field-label">{t.orderStatus}</span><select className="field-input" value={status} onChange={e => setStatus(e.target.value as Status)}>{(['new','preparing','done','cancelled'] as const).map(s => <option key={s} value={s}>{statusLabel(s, t)}</option>)}</select></label>}
        </div>
        <div className="order-composer">
          <div className="order-products">
            <div className="order-prod-search"><Search size={15}/><input className="field-input" value={prodSearch} onChange={e => setProdSearch(e.target.value)} placeholder={t.searchOrderProducts} aria-label={t.searchOrderProducts}/></div>
            <div className="order-prod-grid">
              {prodFiltered.map(p => <button key={p.id} type="button" className="order-prod" onClick={() => addLine(p)} disabled={p.quantity <= 0} title={p.quantity <= 0 ? t.outOfStockShort : t.tapToAdd}>
                {p.image ? <img src={p.image} alt={p.name}/> : <span className="order-prod-ph"><Package size={20}/></span>}
                <span className="order-prod-name">{p.name}</span>
                <span className="order-prod-price" dir="ltr">{fmt(Number(p.price))}</span>
                {p.quantity <= 0 && <span className="order-prod-out">{t.outOfStockShort}</span>}
              </button>)}
              {savedFiltered.map(p => { const d = p.data as Partial<Product>; return <button key={p.id} type="button" className="order-prod saved-prod" onClick={() => addSavedLine(p)} title={t.tapToAdd}>
                {d.image ? <img src={d.image} alt={p.name}/> : <span className="order-prod-ph"><ReceiptText size={20}/></span>}
                <span className="order-prod-kind">{t.savedProductBadge}</span>
                <span className="order-prod-name">{p.name}</span>
                <span className="order-prod-price" dir="ltr">—</span>
              </button>; })}
              {composer && !prodFiltered.length && !savedFiltered.length && <p className="order-prod-empty">{t.noResults}</p>}
            </div>
          </div>
          <div className="order-ticket">
            <label className="field"><span className="field-label">{t.orderNotes}</span><textarea className="field-input" rows={2} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)}/></label>
            <div className="ticket-lines">
              {cart.length === 0 && <p className="ticket-empty">{t.cartEmpty}</p>}
              {cart.map(l => <div key={l.key} className="ticket-line">
                <span className="ticket-name">{l.name}</span>
                <div className="ticket-qty"><button type="button" onClick={() => setQty(l.key, l.qty - 1)}><Minus size={12}/></button><b dir="ltr">{l.qty}</b><button type="button" onClick={() => setQty(l.key, l.qty + 1)}><Plus size={12}/></button></div>
                <input className="ticket-price" dir="ltr" type="number" min={0} step="any" value={l.price} onChange={e => setPrice(l.key, Number(e.target.value) || 0)} aria-label={t.price} title={t.price}/>
                <span className="ticket-sum" dir="ltr">{fmt(l.price * l.qty)}</span>
                <button type="button" className="ticket-del" onClick={() => removeLine(l.key)} aria-label={t.delete}><X size={13}/></button>
              </div>)}
            </div>
            <div className="ticket-total"><span>{t.orderTotal}</span><b dir="ltr">{fmt(total)}</b></div>
            <Button className="w-full" onClick={submit} disabled={busy || !cart.length}>{busy && <LoaderCircle className="animate-spin"/>}{composer?.order ? t.orderUpdated : t.submitOrder}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </AppShell>;
}
