import { describe,it,expect } from 'vitest';
import { defaultElements,productSchema,sampleProduct,words } from '@/components/label-editor/model';
describe('Label document',()=>{
  it('accepts the default product and includes all required data',()=>{expect(productSchema.safeParse(sampleProduct).success).toBe(true);expect(defaultElements.some(e=>e.kind==='barcode')).toBe(true);});
  it('rejects empty names and non-printable CODE128 input',()=>{expect(productSchema.safeParse({...sampleProduct,name:''}).success).toBe(false);expect(productSchema.safeParse({...sampleProduct,barcode:'باركود'}).success).toBe(false);});
  it('keeps default elements within A7 canvas',()=>{for(const el of defaultElements){expect(el.x).toBeGreaterThanOrEqual(0);expect(el.y).toBeGreaterThanOrEqual(0);expect(el.x+el.width).toBeLessThanOrEqual(350);expect(el.y+el.height).toBeLessThanOrEqual(497);}});
  it('has complete Sorani translation coverage',()=>{expect(Object.keys(words.ckb).sort()).toEqual(Object.keys(words.ar).sort());});
});