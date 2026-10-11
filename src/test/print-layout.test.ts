import { describe,it,expect } from 'vitest';
import { arrangeSlots,constrainSlot,slotSize,slotsOverlap } from '@/components/label-editor/print-layout';
import { productSchema,sampleProduct } from '@/components/label-editor/model';
describe('A4 imposition',()=>{
  it('fits one through eight exact A7 labels without overlap',()=>{for(let n=1;n<=8;n++){const slots=arrangeSlots(n);expect(slots).toHaveLength(n);expect(slotsOverlap(slots)).toBe(false);for(const s of slots){const size=slotSize(s);expect(s.x+size.width).toBeLessThanOrEqual(210);expect(s.y+size.height).toBeLessThanOrEqual(297);}}});
  it('clamps moved and rotated slots to sheet boundaries',()=>{expect(constrainSlot({x:400,y:-3,rotated:false})).toEqual({x:136,y:0,rotated:false});expect(constrainSlot({x:400,y:400,rotated:true})).toEqual({x:105,y:223,rotated:true});});
  it('detects overlapping labels',()=>{expect(slotsOverlap([{x:0,y:0,rotated:false},{x:10,y:10,rotated:true}])).toBe(true);});
  it('accepts Unicode QR values but keeps CODE128 ASCII-only',()=>{expect(productSchema.safeParse({...sampleProduct,codeFormat:'qr',barcode:'https://example.com/منتج'}).success).toBe(true);expect(productSchema.safeParse({...sampleProduct,codeFormat:'code128',barcode:'منتج'}).success).toBe(false);});
});