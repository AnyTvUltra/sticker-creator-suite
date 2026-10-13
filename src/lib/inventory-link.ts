import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { defaultElements, sampleProduct, type DocumentState, type LabelElement, type Product } from '@/components/label-editor/model';

export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];

let linkColumn: boolean | null = null;
/** Whether label_products has inventory_item_id (added by setup.sql); false on schemas migrated before it. */
export async function hasLinkColumn(): Promise<boolean> {
  if (linkColumn !== null) return linkColumn;
  const { error } = await supabase.from('label_products').select('inventory_item_id').limit(0);
  linkColumn = !error;
  return linkColumn;
}

export const DRAFT_KEY = 'wasm-draft';
export const DRAFT_PRODUCT_ID_KEY = 'wasm-product-id';
export const DRAFT_INVENTORY_ID_KEY = 'wasm-inventory-id';
/** One-shot flag: the editor opens its print dialog right after loading the draft. */
export const OPEN_PRINT_KEY = 'wasm-open-print';

/** Inventory fields that mirror the label's product data (the inventory item is the source of truth). */
export function itemFieldsFromProduct(p: Partial<Product>, fallbackName = '') {
  return { name: (p.name || fallbackName).trim(), model: p.model ?? '', color: p.color ?? '', size: p.size ?? '', specs: p.specs ?? '', warranty: p.warranty ?? '', image: p.image ?? '', barcode: p.barcode ?? '' };
}

const isCode128 = (code: string) => /^[\x20-\x7E]{1,40}$/.test(code);

/** Label fields filled from an inventory item; keeps the store name and anything the item does not define. */
export function productFromItem(item: InventoryItem, base: Product = sampleProduct): Product {
  const code = item.barcode.trim() || item.sku.trim() || item.id.replace(/-/g, '').slice(0, 12);
  return {
    ...base,
    name: item.name, model: item.model, color: item.color, size: item.size, specs: item.specs, warranty: item.warranty,
    barcode: code, codeFormat: isCode128(code) ? 'code128' : 'qr', image: item.image,
  };
}

/** Resize the barcode element when the code format changes between CODE128 and QR. */
export function fitBarcodeElement(elements: LabelElement[], before: Product['codeFormat'], after: Product['codeFormat']): LabelElement[] {
  if ((before === 'qr') === (after === 'qr')) return elements;
  const qr = after === 'qr';
  return elements.map(el => el.kind === 'barcode' ? { ...el, width: qr ? 60 : 270, height: qr ? 60 : 45, x: qr ? 145 : 40, y: qr ? 418 : 427 } : el);
}

/** Store a draft so the editor opens it; links it to the inventory item and optionally an existing saved label. */
export function openItemInEditor(item: InventoryItem, saved?: { id: string; data: Product; layout: LabelElement[]; theme: string }, print = false) {
  if (print) sessionStorage.setItem(OPEN_PRINT_KEY, '1'); else sessionStorage.removeItem(OPEN_PRINT_KEY);
  let store = sampleProduct.store;
  try { store = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null')?.product?.store || store; } catch { /* ignore invalid draft */ }
  const base = saved?.data ?? { ...sampleProduct, store };
  const product = productFromItem(item, base);
  const elements = fitBarcodeElement(saved?.layout ?? defaultElements, saved ? base.codeFormat : 'code128', product.codeFormat);
  const draft: DocumentState = { product, elements, theme: saved?.theme ?? 'mint' };
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  sessionStorage.setItem(DRAFT_INVENTORY_ID_KEY, item.id);
  if (saved) sessionStorage.setItem(DRAFT_PRODUCT_ID_KEY, saved.id); else sessionStorage.removeItem(DRAFT_PRODUCT_ID_KEY);
}
