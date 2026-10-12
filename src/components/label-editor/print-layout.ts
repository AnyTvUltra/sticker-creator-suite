export type PrintSlot = { x:number; y:number; rotated:boolean; productId?:string|undefined };
export function slotSize(slot:PrintSlot) {return slot.rotated ? {width:105,height:74} : {width:74,height:105};}
export function constrainSlot(slot:PrintSlot):PrintSlot {
  const size=slotSize(slot);
  return {...slot,x:Math.max(0,Math.min(210-size.width,slot.x)),y:Math.max(0,Math.min(297-size.height,slot.y))};
}
export function arrangeSlots(count:number):PrintSlot[] {
  if(count<=4) return Array.from({length:count},(_,i)=>({x:5+(i%2)*79,y:5+Math.floor(i/2)*110,rotated:false}));
  return Array.from({length:count},(_,i)=>({x:(i%2)*105,y:Math.floor(i/2)*74,rotated:true}));
}
export function slotsOverlap(slots:PrintSlot[]) {
  return slots.some((a,i)=>slots.slice(i+1).some(b=>{const sa=slotSize(a),sb=slotSize(b);return a.x<b.x+sb.width && a.x+sa.width>b.x && a.y<b.y+sb.height && a.y+sa.height>b.y;}));
}