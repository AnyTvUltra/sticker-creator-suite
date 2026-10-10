import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react';
import JsBarcode from 'jsbarcode';
import { Headphones, ShieldCheck, Store } from 'lucide-react';
import headphones from '@/assets/headphones.jpg';
import { words, type DocumentState, type LabelElement, type Language } from './model';

export function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try { JsBarcode(ref.current, value || '0', { format:'CODE128', width:1.6, height:32, displayValue:true, fontSize:10, margin:0, background:'transparent' }); }
    catch { ref.current.replaceChildren(); }
  }, [value]);
  return <svg ref={ref} aria-label={`Barcode ${value}`} />;
}

export function LabelCanvas({ document, language, selected, onSelect, onMove, printing=false }: { document: DocumentState; language: Language; selected?: string; onSelect?: (id: string) => void; onMove?: (id: string, x: number, y: number, commit: boolean) => void; printing?: boolean }) {
  const paperRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; startX: number; startY: number; x: number; y: number; scale: number } | null>(null);
  const { product:p, elements, theme } = document;
  const t = words[language];
  function start(e: PointerEvent<HTMLDivElement>, el: LabelElement) {
    if (printing) return;
    e.stopPropagation(); onSelect?.(el.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id:el.id, startX:e.clientX, startY:e.clientY, x:el.x, y:el.y, scale:(paperRef.current?.getBoundingClientRect().width || 350)/350 };
  }
  function move(e: PointerEvent<HTMLDivElement>, el: LabelElement, commit: boolean) {
    const d = drag.current;
    if (!d || d.id !== el.id) return;
    onMove?.(el.id, Math.round(Math.max(0,Math.min(350-el.width,d.x+(e.clientX-d.startX)/d.scale))), Math.round(Math.max(8,Math.min(497-el.height,d.y+(e.clientY-d.startY)/d.scale))), commit);
    if (commit) drag.current=null;
  }
  return <div ref={paperRef} className={`label-paper theme-${theme}`} dir="rtl" onClick={() => !printing && onSelect?.('')}>
    <div className="label-stripe" />
    {elements.filter(el=>el.visible).map(el=><div key={el.id} data-element={el.id} aria-label={el.kind} className={`label-element ${selected===el.id && !printing ? 'is-selected':''}`} style={{ left:el.x,top:el.y,width:el.width,height:el.height } as CSSProperties} onPointerDown={e=>start(e,el)} onPointerMove={e=>move(e,el,false)} onPointerUp={e=>move(e,el,true)} onPointerCancel={()=>{drag.current=null;}} onClick={e=>e.stopPropagation()}>
      <div className={`label-${el.kind}`} style={{ ...(el.fontSize ? { fontSize:el.fontSize } : {}), ...(el.bold ? {fontWeight:750}:{}), ...(el.align ? {textAlign:el.align}:{}), height:'100%' }}>
        {el.kind==='store' && <><Store size={13}/>{p.store}</>}
        {el.kind==='name' && p.name}
        {el.kind==='model' && p.model}
        {el.kind==='photo' && (p.image || p.name=== 'سماعات لاسلكية' ? <img src={p.image || headphones} alt={p.name} width={170} height={148}/> : <Headphones className="mx-auto h-full w-16 text-muted-foreground"/>)}
        {el.kind==='details' && <><span>{t.color}: {p.color}</span><span>·</span><span>{t.size}: {p.size}</span></>}
        {el.kind==='specs' && p.specs}
        {el.kind==='warranty' && <><ShieldCheck size={13}/>{p.warranty}</>}
        {el.kind==='barcode' && <Barcode value={p.barcode}/>}
        {el.kind==='footer' && t.footer}
        {el.kind==='text' && (el.text || t.customText)}
        {el.kind==='line' && <hr className="mt-1 border-border"/>}
      </div>
    </div>)}
  </div>;
}