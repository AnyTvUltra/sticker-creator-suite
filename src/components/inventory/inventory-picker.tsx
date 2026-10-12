import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Package, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/app/session';
import { ui } from '@/components/app/i18n';
import type { InventoryItem } from '@/lib/inventory-link';

export function InventoryPicker({ onClose, onPick }: { onClose: () => void; onPick: (item: InventoryItem) => void }) {
  const { language } = useSession();
  const t = ui[language];
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('inventory_items').select('*').order('name').then(({ data }) => setItems(data ?? []));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items ?? []).filter(i => !q || [i.name, i.model, i.sku, i.barcode, i.category].some(v => v.toLowerCase().includes(q)));
  }, [items, search]);

  function onEnter() {
    const q = search.trim().toLowerCase();
    const hit = items?.find(i => i.barcode.toLowerCase() === q || i.sku.toLowerCase() === q) ?? (filtered.length === 1 ? filtered[0] : undefined);
    if (hit) onPick(hit);
  }

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent dir="rtl" className="inv-dialog">
      <DialogHeader><DialogTitle>{t.pickItem}</DialogTitle><DialogDescription>{t.searchItems}</DialogDescription></DialogHeader>
      <div className="inv-search"><Search size={16}/><input className="field-input" autoFocus value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onEnter(); }} placeholder={t.searchItems} aria-label={t.searchItems}/></div>
      {items === null ? <LoaderCircle className="mx-auto my-10 animate-spin text-muted-foreground"/> : filtered.length === 0 ? <div className="empty-library py-12"><Package/><h2>{items.length ? t.noResults : t.emptyInv}</h2></div> :
        <ul className="picker-list">{filtered.map(i => <li key={i.id}><button type="button" onClick={() => onPick(i)}>
          {i.image ? <img src={i.image} alt=""/> : <span className="picker-thumb">{i.name.slice(0, 1)}</span>}
          <span className="picker-text"><b>{i.name}</b><small dir="ltr">{[i.model, i.barcode || i.sku].filter(Boolean).join(' · ')}</small></span>
          <span className={`inv-badge-inline inv-${i.quantity <= 0 ? 'out' : i.quantity <= i.min_quantity ? 'low' : 'in'}`} dir="ltr">{i.quantity}</span>
        </button></li>)}</ul>}
    </DialogContent>
  </Dialog>;
}
