import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { defaultElements, productSchema, sampleProduct, type DocumentState, type LabelElement, type Product } from '@/components/label-editor/model';

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

/** Code format a layout was designed for, judged by its barcode element's shape (QR is square). */
export function layoutFormat(elements: LabelElement[]): Product['codeFormat'] {
  const code = elements.find(el => el.kind === 'barcode');
  return code && code.width < code.height * 2 ? 'qr' : 'code128';
}

export type DefaultTemplate = { id: string; name: string; elements: LabelElement[]; theme: string; store: string };
const DEFAULT_TEMPLATE_KEY = 'wasm-default-template';
/** The shop template new labels start from; a per-device choice kept in localStorage. */
export function getDefaultTemplate(): DefaultTemplate | null {
  try {
    const tpl = JSON.parse(localStorage.getItem(DEFAULT_TEMPLATE_KEY) || 'null');
    return tpl && typeof tpl.id === 'string' && Array.isArray(tpl.elements) ? tpl : null;
  } catch { return null; }
}
export function setDefaultTemplate(tpl: DefaultTemplate | null) {
  if (tpl) localStorage.setItem(DEFAULT_TEMPLATE_KEY, JSON.stringify(tpl)); else localStorage.removeItem(DEFAULT_TEMPLATE_KEY);
}

export type SavedDesign = { id: string; data: Product; layout: LabelElement[]; theme: string };
/** Parse a label_products row into a design, or undefined when its JSON is unusable. */
export function parseSavedDesign(row: { id: string; data: unknown; layout: unknown; theme: string } | undefined): SavedDesign | undefined {
  const parsed = row && productSchema.safeParse(row.data);
  return row && parsed?.success && Array.isArray(row.layout) ? { id: row.id, data: parsed.data, layout: row.layout as LabelElement[], theme: row.theme } : undefined;
}

/** Label document for an inventory item: its saved design, else the default template, else the built-in layout. */
export function docForItem(item: InventoryItem, saved?: SavedDesign): DocumentState {
  const tpl = saved ? null : getDefaultTemplate();
  let store = sampleProduct.store;
  try { store = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null')?.product?.store || store; } catch { /* ignore invalid draft */ }
  const base = saved?.data ?? { ...sampleProduct, store: tpl?.store || store };
  const layout = saved?.layout ?? tpl?.elements ?? defaultElements;
  const product = productFromItem(item, base);
  return { product, elements: fitBarcodeElement(layout, saved ? base.codeFormat : layoutFormat(layout), product.codeFormat), theme: saved?.theme ?? tpl?.theme ?? 'mint' };
}

/** Store a draft so the editor opens it; links it to the inventory item and optionally an existing saved label. */
export function openItemInEditor(item: InventoryItem, saved?: SavedDesign, print = false) {
  if (print) sessionStorage.setItem(OPEN_PRINT_KEY, '1'); else sessionStorage.removeItem(OPEN_PRINT_KEY);
  const draft = docForItem(item, saved);
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  sessionStorage.setItem(DRAFT_INVENTORY_ID_KEY, item.id);
  if (saved) sessionStorage.setItem(DRAFT_PRODUCT_ID_KEY, saved.id); else sessionStorage.removeItem(DRAFT_PRODUCT_ID_KEY);
}
