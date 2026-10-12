import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import { Headphones, ShieldCheck, Store } from 'lucide-react';
import headphones from '@/assets/headphones.jpg';
import { words, type DocumentState, type LabelElement, type Language, type Product } from './model';

export function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      const svg = ref.current;
      JsBarcode(svg, value || '0', { format:'CODE128', width:1.6, height:32, displayValue:true, fontSize:10, margin:0, background:'transparent' });
      // Let the barcode scale with its element box instead of staying at its intrinsic pixel size.
      const width = parseFloat(svg.getAttribute('width') || ''), height = parseFloat(svg.getAttribute('height') || '');
      if (width && height) svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.removeAttribute('width'); svg.removeAttribute('height');
    }
    catch { ref.current.replaceChildren(); }
  }, [value]);
  return <svg ref={ref} aria-label={`Barcode ${value}`} />;
}

export function LabelCanvas({ document, language, selected, onSelect, onMove, onTextChange, printing=false }: { document: DocumentState; language: Language; selected?: string; onSelect?: (id: string) => void; onMove?: (id: string, x: number, y: number, commit: boolean) => void; onTextChange?: (id:string,value:string,field?:keyof Product)=>void; printing?: boolean }) {
  const [editing,setEditing]=useState<string|null>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const stopDrag = useRef<(() => void) | null>(null);
  const { product:p, elements, theme } = document;
  const t = words[language];
  useEffect(() => () => stopDrag.current?.(), []);
  // Track the drag on window so fast moves or releasing outside the element never leave a drag "stuck".
  function start(e: PointerEvent<HTMLDivElement>, el: LabelElement) {
    if (printing || e.button !== 0 || editing?.startsWith(`${el.id}:`)) return;
    e.stopPropagation(); onSelect?.(el.id);
    stopDrag.current?.();
    const startX = e.clientX, startY = e.clientY, scale = (paperRef.current?.getBoundingClientRect().width || 350) / 350;
    let moved = false, last: [number, number] = [el.x, el.y];
    const position = (ev: globalThis.PointerEvent): [number, number] => [
      Math.round(Math.max(0, Math.min(350 - el.width, el.x + (ev.clientX - startX) / scale))),
      Math.round(Math.max(8, Math.min(497 - el.height, el.y + (ev.clientY - startY) / scale))),
    ];
    const onPointerMove = (ev: globalThis.PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - startX) < 3 && Math.abs(ev.clientY - startY) < 3) return;
      moved = true; ev.preventDefault();
      last = position(ev);
      onMove?.(el.id, ...last, false);
    };
    const onPointerUp = (ev: globalThis.PointerEvent) => { if (moved) last = position(ev); cleanup(); };
    const cleanup = () => {
      if (moved) onMove?.(el.id, ...last, true);
      moved = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', cleanup);
      window.document.body.classList.remove('is-dragging-label');
      stopDrag.current = null;
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', cleanup);
    window.document.body.classList.add('is-dragging-label');
    stopDrag.current = cleanup;
  }
  function editable(el:LabelElement,value:string,field?:keyof Product) {
    if(editing===`${el.id}:${field ?? 'text'}` && !printing) return <textarea autoFocus aria-label={field ? (field==='store'?t.store:t[field as 'name']) : t.text} className="inline-label-input" defaultValue={value} maxLength={field==='specs'?500:field==='barcode'?500:120} onPointerDown={e=>e.stopPropagation()} onBlur={e=>{onTextChange?.(el.id,e.target.value,field);setEditing(null);}} onKeyDown={e=>{if(e.key==='Escape'){setEditing(null);}if(e.key==='Enter' && !e.shiftKey){e.preventDefault();e.currentTarget.blur();}}}/>;
    return <span onDoubleClick={e=>{if(printing || !onTextChange)return;e.stopPropagation();onSelect?.(el.id);setEditing(`${el.id}:${field ?? 'text'}`);}}>{value}</span>;
  }
  return <div ref={paperRef} className={`label-paper theme-${theme}`} dir="rtl" onClick={() => !printing && onSelect?.('')}>
    <div className="label-stripe" />
    {elements.filter(el=>el.visible).map(el=><div key={el.id} data-element={el.id} aria-label={el.kind} className={`label-element ${selected===el.id && !printing ? 'is-selected':''}`} style={{ left:el.x,top:el.y,width:el.width,height:el.height } as CSSProperties} onDoubleClick={()=>{if(!printing && onTextChange && !['photo','line','barcode','details'].includes(el.kind)) {onSelect?.(el.id);setEditing(`${el.id}:${['store','name','model','specs','warranty'].includes(el.kind)?el.kind:'text'}`);}}} onPointerDown={e=>start(e,el)} onDragStart={e=>e.preventDefault()} onClick={e=>e.stopPropagation()}>
      <div className={`label-${el.kind} ${el.textColor?`ink-${el.textColor}`:''}`} style={{ ...(el.fontSize ? { fontSize:el.fontSize } : {}), fontWeight:el.fontWeight ?? (el.bold ? 750:undefined), ...(el.align ? {textAlign:el.align}:{}), height:'100%' }}>
        {el.kind==='store' && <><Store size={13}/>{editable(el,p.store,'store')}</>}
        {el.kind==='name' && editable(el,p.name,'name')}
        {el.kind==='model' && editable(el,p.model,'model')}
        {el.kind==='photo' && (p.image || p.name=== 'سماعات لاسلكية' ? <img src={p.image || headphones} alt={p.name} width={170} height={148} draggable={false}/> : <Headphones className="mx-auto h-full w-16 text-muted-foreground"/>)}
        {el.kind==='details' && <><span>{t.color}: {editable(el,p.color,'color')}</span><span>·</span><span>{t.size}: {editable(el,p.size,'size')}</span></>}
        {el.kind==='specs' && editable(el,p.specs,'specs')}
        {el.kind==='warranty' && <><ShieldCheck size={13}/>{editable(el,p.warranty,'warranty')}</>}
        {el.kind==='barcode' && (p.codeFormat==='qr'?<QRCodeSVG className="label-qr" value={p.barcode || '0'} marginSize={4} level="M"/>:<Barcode value={p.barcode}/>)}
        {el.kind==='footer' && editable(el,el.text ?? t.footer)}
        {el.kind==='text' && editable(el,el.text ?? t.customText)}
        {el.kind==='line' && <hr className="mt-1 border-border"/>}
      </div>
    </div>)}
  </div>;
}