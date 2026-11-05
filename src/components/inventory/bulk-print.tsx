import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Printer, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ui } from '@/components/app/i18n';
import { PrintSheet } from '@/components/label-editor/print-sheet';
import { arrangeSlots } from '@/components/label-editor/print-layout';
import type { DocumentState, Language } from '@/components/label-editor/model';
import { getDefaultTemplate, type InventoryItem } from '@/lib/inventory-link';

export type BulkEntry = { item: InventoryItem; doc: DocumentState; saved: boolean };

/** Prints several inventory items on shared A4 sheets (8 A7 labels per sheet), each with its own copy count. */
export function BulkPrintDialog({ entries, language, onRemove, onClose }: { entries: BulkEntry[]; language: Language; onRemove: (id: string) => void; onClose: () => void }) {
  const t = ui[language];
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0);
  const template = useMemo(() => getDefaultTemplate(), []);
  const labels = useMemo(() => entries.flatMap(e => Array.from({ length: copies[e.item.id] ?? 1 }, () => e.doc)), [entries, copies]);
  const pages = useMemo(() => Array.from({ length: Math.ceil(labels.length / 8) }, (_, i) => labels.slice(i * 8, i * 8 + 8)), [labels]);
  const shown = pages[Math.min(page, pages.length - 1)] ?? [];
  const first = entries[0]?.doc;
  const setCount = (id: string, value: number) => setCopies(c => ({ ...c, [id]: Math.max(1, Math.min(50, Math.round(value) || 1)) }));

  return <>
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent dir="rtl" className="print-dialog bulk-print">
        <DialogHeader><DialogTitle>{t.bulkPrintTitle}</DialogTitle><DialogDescription>{t.bulkPrintHint}</DialogDescription></DialogHeader>
        <ul className="bulk-list">{entries.map(e => <li key={e.item.id}>
          <div className="bulk-info"><b>{e.item.name}</b><span><Tag size={11}/>{e.saved ? t.savedLabel : template ? template.name : t.builtInLayout}</span></div>
          <input className="field-input" type="number" min={1} max={50} aria-label={`${e.item.name} ×`} value={copies[e.item.id] ?? 1} onChange={ev => setCount(e.item.id, Number(ev.target.value))}/>
          <Button variant="ghost" size="icon" aria-label={t.removeFromList} title={t.removeFromList} onClick={() => onRemove(e.item.id)}><X/></Button>
        </li>)}</ul>
        <div className="bulk-summary">
          <span>{t.labelsTotal.replace('{n}', String(labels.length)).replace('{p}', String(pages.length))}</span>
          {pages.length > 1 && <span className="bulk-pager">
            <Button variant="ghost" size="icon" aria-label="prev" disabled={page <= 0} onClick={() => setPage(p => p - 1)}><ChevronRight/></Button>
            {t.sheetN.replace('{i}', String(Math.min(page, pages.length - 1) + 1)).replace('{p}', String(pages.length))}
            <Button variant="ghost" size="icon" aria-label="next" disabled={page >= pages.length - 1} onClick={() => setPage(p => p + 1)}><ChevronLeft/></Button>
          </span>}
        </div>
        {first && <div className="a4-preview"><div className="a4-preview-frame"><PrintSheet document={first} documents={shown} language={language} slots={arrangeSlots(shown.length)}/></div></div>}
        {pages.some(p => p.length > 4) && <p className="text-xs text-muted-foreground">{t.edgeHint}</p>}
        <div className="inv-form-actions"><Button variant="outline" onClick={onClose}>{t.cancel}</Button><Button disabled={!labels.length} onClick={() => window.print()}><Printer/>{t.printSelected}</Button></div>
      </DialogContent>
    </Dialog>
    {first && createPortal(<div className="print-only print-a4"><style>{'@media print { @page { size:210mm 297mm; margin:0; } }'}</style>
      {pages.map((docs, i) => <div className="print-page" key={i}><PrintSheet document={first} documents={docs} language={language} slots={arrangeSlots(docs.length)}/></div>)}
    </div>, window.document.body)}
  </>;
}
