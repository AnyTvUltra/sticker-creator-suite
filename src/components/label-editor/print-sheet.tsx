import { useRef, type PointerEvent } from 'react';
import { LabelCanvas } from './label-canvas';
import type { DocumentState, Language } from './model';
import { constrainSlot, slotSize, type PrintSlot } from './print-layout';

export function PrintSheet({document,language,slots,selected,onSelect,onMove}:{document:DocumentState;language:Language;slots:PrintSlot[];selected?:number;onSelect?:(index:number)=>void;onMove?:(index:number,slot:PrintSlot)=>void}) {
  const ref=useRef<HTMLDivElement>(null);
  const drag=useRef<{index:number;x:number;y:number;slot:PrintSlot;ratio:number}|null>(null);
  function start(e:PointerEvent<HTMLDivElement>,index:number) {
    if(!onMove)return;
    onSelect?.(index);e.currentTarget.setPointerCapture(e.pointerId);
    drag.current={index,x:e.clientX,y:e.clientY,slot:slots[index],ratio:(ref.current?.getBoundingClientRect().width || 210)/210};
  }
  function move(e:PointerEvent<HTMLDivElement>,finish=false) {
    const d=drag.current;if(!d)return;
    onMove?.(d.index,constrainSlot({...d.slot,x:Math.round((d.slot.x+(e.clientX-d.x)/d.ratio)*10)/10,y:Math.round((d.slot.y+(e.clientY-d.y)/d.ratio)*10)/10}));
    if(finish)drag.current=null;
  }
  return <div ref={ref} className="a4-sheet" aria-label="A4">
    {slots.map((slot,index)=>{const size=slotSize(slot);return <div key={index} className={`sheet-slot ${onMove?'movable':''} ${selected===index?'selected-slot':''}`} aria-label={`${language==='ar'?'ملصق':'لیبڵ'} ${index+1}`} tabIndex={onMove?0:undefined} onClick={()=>onSelect?.(index)} onPointerDown={e=>start(e,index)} onPointerMove={e=>move(e)} onPointerUp={e=>move(e,true)} onPointerCancel={()=>{drag.current=null;}} onKeyDown={e=>{if(!onMove)return;const delta=({ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]} as Record<string,number[]>)[e.key];if(delta){e.preventDefault();onMove(index,constrainSlot({...slot,x:slot.x+delta[0],y:slot.y+delta[1]}));}}} style={{left:`${slot.x}mm`,top:`${slot.y}mm`,width:`${size.width}mm`,height:`${size.height}mm`}}>
      <div className={`sheet-label ${slot.rotated?'rotated':''}`}><LabelCanvas document={document} language={language} printing/></div>
      {onMove && <span className="slot-number">{index+1}</span>}
    </div>;})}
  </div>;
}