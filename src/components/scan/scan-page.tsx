import { useCallback, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Barcode as BarcodeIcon, Camera, CameraOff, CheckCheck, LoaderCircle, Package, Pencil, Printer, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { AppShell } from '@/components/app/app-shell';
import { useSession } from '@/components/app/session';
import { rpcError, ui } from '@/components/app/i18n';
import { defaultElements, sampleProduct, type LabelElement, type Product } from '@/components/label-editor/model';
import { DRAFT_INVENTORY_ID_KEY, DRAFT_KEY, DRAFT_PRODUCT_ID_KEY, fitBarcodeElement, hasLinkColumn, openItemInEditor, type InventoryItem } from '@/lib/inventory-link';
import { BarcodeScanner, isCameraDenied } from './barcode-scanner';

type SavedLabel = Pick<Database['public']['Tables']['label_products']['Row'], 'id' | 'name' | 'data' | 'layout' | 'theme'>;
type Hit = { kind: 'item'; item: InventoryItem } | { kind: 'label'; prod: SavedLabel };
const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(n) || 0);
const stockOf = (i: InventoryItem) => i.quantity <= 0 ? 'out' : i.quantity <= i.min_quantity ? 'low' : 'in';

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.frequency.value = 1400; gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => void ctx.close();
  } catch { /* audio unavailable */ }
}

export function ScanPage() {
  const { language, can } = useSession();
  const u = ui[language];
  const navigate = useNavigate();
  const [running, setRunning] = useState(true);
  const [code, setCode] = useState('');
  const [manual, setManual] = useState('');
  const [hit, setHit] = useState<Hit | null>(null);
  const [missed, setMissed] = useState('');
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(1);
  const lastRef = useRef<{ code: string; t: number }>({ code: '', t: 0 });

  async function lookup(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setBusy(true); setCode(text); setMissed(''); setHit(null);
    const esc = text.replace(/"/g, '\\"');
    const { data: items } = await supabase.from('inventory_items').select('*').or(`barcode.eq."${esc}",sku.eq."${esc}"`).limit(2);
    const item = items?.[0];
    if (item) { setHit({ kind: 'item', item }); setAmount(1); setBusy(false); beep(); return; }
    const { data: prods } = await supabase.from('label_products').select('id,name,data,layout,theme').eq('data->>barcode', text).limit(1);
    setBusy(false);
    const prod = prods?.[0];
    if (prod) { setHit({ kind: 'label', prod }); beep(); return; }
    setMissed(text);
  }

  const onScan = useCallback((text: string) => {
    const now = Date.now(); const last = lastRef.current;
    if (last.code === text && now - last.t < 2500) return;
    lastRef.current = { code: text, t: now };
    void lookup(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function adjust(delta: number) {
    if (hit?.kind !== 'item') return;
    const n = Math.abs(delta);
    if (delta < 0 && hit.item.quantity < n) { toast.error(u.insufficient); return; }
    const { data, error } = await supabase.rpc('adjust_stock', { p_item: hit.item.id, p_delta: delta, p_note: 'scan' });
    if (error) { toast.error(rpcError(error.message, u)); return; }
    setHit({ kind: 'item', item: { ...hit.item, quantity: data } });
    toast.success(u.saved);
  }

  async function printLabel(item: InventoryItem) {
    setBusy(true);
    let saved: SavedLabel | undefined;
    if (await hasLinkColumn()) {
      const { data } = await supabase.from('label_products').select('id,name,data,layout,theme').eq('inventory_item_id', item.id).limit(1);
      saved = data?.[0];
    }
    setBusy(false);
    openItemInEditor(item, saved ? { id: saved.id, data: saved.data as unknown as Product, layout: saved.layout as unknown as LabelElement[], theme: saved.theme } : undefined);
    navigate({ to: '/' });
  }

  function createProduct(text: string) {
    const code128 = /^[\x20-\x7E]{1,40}$/.test(text);
    const product = { ...sampleProduct, barcode: text, codeFormat: code128 ? 'code128' as const : 'qr' as const, name: '', model: '', image: '' };
    const draft = { product, elements: fitBarcodeElement(defaultElements, 'code128', product.codeFormat), theme: 'mint' };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    sessionStorage.removeItem(DRAFT_PRODUCT_ID_KEY);
    sessionStorage.removeItem(DRAFT_INVENTORY_ID_KEY);
    navigate({ to: '/' });
  }

  function openSavedLabel(prod: SavedLabel) {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ product: prod.data, elements: prod.layout, theme: prod.theme }));
    sessionStorage.setItem(DRAFT_PRODUCT_ID_KEY, prod.id);
    sessionStorage.removeItem(DRAFT_INVENTORY_ID_KEY);
    navigate({ to: '/' });
  }

  const item = hit?.kind === 'item' ? hit.item : null;
  const prod = hit?.kind === 'label' ? hit.prod : null;
  const prodData = prod ? prod.data as unknown as Partial<Product> : null;
  const st = item ? stockOf(item) : null;

  return <AppShell active="scan">
    <main className="scan-page">
      <div className="library-top"><div><h1>{u.scanTitle}</h1><p className="orders-sub">{u.scanSubtitle}</p></div></div>

      <section className="scan-stage">
        <div className="scan-cam-wrap">
          {running
            ? <BarcodeScanner onResult={onScan} onError={err => { setRunning(false); toast.error(isCameraDenied(err) ? u.cameraDenied : u.cameraError); }}/>
            : <div className="scan-cam-off"><CameraOff size={42}/><p>{u.cameraOff}</p></div>}
          <div className="scan-cam-actions">
            <Button variant="outline" size="sm" onClick={() => setRunning(r => !r)}>{running ? <CameraOff/> : <Camera/>}{running ? u.scanStop : u.scanStart}</Button>
            {hit && <Button variant="outline" size="sm" onClick={() => { setHit(null); setCode(''); }}><RotateCcw/>{u.scanAgain}</Button>}
          </div>
          {running && <p className="scan-cam-hint"><BarcodeIcon size={14}/>{u.scanHint}</p>}
        </div>

        <div className="scan-side">
          <form className="scan-manual" onSubmit={e => { e.preventDefault(); void lookup(manual); }}>
            <span className="field-label">{u.scanManual}</span>
            <div className="scan-manual-row">
              <input className="field-input" dir="ltr" value={manual} onChange={e => setManual(e.target.value)} placeholder="6291041500213" aria-label={u.scanManual}/>
              <Button type="submit" disabled={busy || !manual.trim()}>{busy ? <LoaderCircle className="animate-spin"/> : <Search/>}{u.scanGo}</Button>
            </div>
            <p className="scan-usb-hint">{u.scanUsbHint}</p>
          </form>
          {busy && <div className="scan-status"><LoaderCircle className="animate-spin"/>{u.searching}</div>}
          {missed && !busy && <div className="scan-miss"><AlertTriangle size={18}/><div><b>{u.scanNotFound}</b><p dir="ltr">{missed}</p>{can('labels.design') && <Button size="sm" variant="outline" className="mt-2" onClick={() => createProduct(missed)}><Pencil/>{u.createProductWithCode}</Button>}</div></div>}
        </div>
      </section>

      {hit && <section className={`scan-result ${item ? `st-${st}` : ''}`}>
        <div className="scan-result-media">
          {item?.image ? <img src={item.image} alt={item.name}/> : prodData?.image ? <img src={prodData.image} alt={prod?.name}/> : <span className="scan-result-ph"><Package size={44}/></span>}
          {st && <span className={`inv-badge-inline inv-${st} scan-badge`}>{st === 'in' ? u.inStock : st === 'low' ? u.lowStock : u.outStock}</span>}
        </div>
        <div className="scan-result-body">
          <div className="scan-result-head">
            <div>
              <span className="scan-hit-kind">{item ? u.fromInventory : u.fromProducts}</span>
              <h2>{item?.name ?? prod?.name}</h2>
              <p className="scan-model" dir="ltr">{item?.model || prodData?.model || '—'}</p>
            </div>
            <div className="scan-price-box"><span>{u.price}</span><b dir="ltr">{item ? fmt(item.price) : '—'}</b></div>
          </div>
          <div className="scan-details">
            <div><span>{u.barcode}</span><b dir="ltr">{item?.barcode || prodData?.barcode || '—'}</b></div>
            {item?.sku ? <div><span>{u.sku}</span><b dir="ltr">{item.sku}</b></div> : null}
            {item && <div><span>{u.quantity}</span><b dir="ltr">{item.quantity} {u.piece}</b></div>}
            {item?.category ? <div><span>{u.category}</span><b>{item.category}</b></div> : null}
            {item?.location ? <div><span>{u.location}</span><b>{item.location}</b></div> : null}
            {item ? <div><span>{u.cost}</span><b dir="ltr">{fmt(item.cost)}</b></div> : null}
            <div><span>{u.scannedCode}</span><b dir="ltr"><CheckCheck size={13}/> {code}</b></div>
          </div>
          <div className="scan-result-actions">
            {item && can('inventory.stock') && <div className="scan-adjust">
              <input className="field-input" dir="ltr" type="number" min={1} value={amount} onChange={e => setAmount(Math.max(1, Math.round(Number(e.target.value)) || 1))} aria-label={u.amount}/>
              <Button variant="outline" size="sm" onClick={() => adjust(amount)}><ArrowDownToLine/>{u.stockIn}</Button>
              <Button variant="outline" size="sm" onClick={() => adjust(-amount)} disabled={item.quantity < amount}><ArrowUpFromLine/>{u.stockOut}</Button>
            </div>}
            {item && can('labels.print') && <Button size="sm" onClick={() => void printLabel(item)} disabled={busy}><Printer/>{u.printLabel}</Button>}
            {prod && can('labels.design') && <Button size="sm" onClick={() => openSavedLabel(prod)}><Pencil/>{u.openInEditor}</Button>}
            <Button variant="ghost" size="sm" onClick={() => { setHit(null); setCode(''); }}><RotateCcw/>{u.scanAgain}</Button>
          </div>
        </div>
      </section>}
    </main>
  </AppShell>;
}
