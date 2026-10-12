import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from '@tanstack/react-router';
import { AlignCenter, AlignLeft, AlignRight, ArrowDownToLine, ArrowLeft, ArrowRight, Barcode as BarcodeIcon, Bold, Check, CheckCheck, ChevronDown, CircleHelp, Copy, Eye, EyeOff, FileText, GripVertical, ImagePlus, Languages, Layers, LayoutTemplate, LoaderCircle, Maximize, Minus, MousePointer2, Package, Pencil, Plus, Printer, Redo2, RotateCcw, Save, ScanLine, Settings2, ShieldCheck, Sparkles, Tag, Trash2, Type, Undo2, Upload, X, ZoomIn, ZoomOut, Boxes, Link2, RefreshCw, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/app/session';
import { AppShell } from '@/components/app/app-shell';
import { ui } from '@/components/app/i18n';
import { InventoryPicker } from '@/components/inventory/inventory-picker';
import { BarcodeScanner, isCameraDenied } from '@/components/scan/barcode-scanner';
import { DRAFT_INVENTORY_ID_KEY, DRAFT_KEY, DRAFT_PRODUCT_ID_KEY, fitBarcodeElement, hasLinkColumn, productFromItem, type InventoryItem } from '@/lib/inventory-link';
import type { Database, Json } from '@/integrations/supabase/types';
import headphones from '@/assets/headphones.jpg';
import { defaultElements, productSchema, sampleProduct, words, type DocumentState, type ElementKind, type LabelElement, type Language, type Product } from './model';
import { LabelCanvas } from './label-canvas';
import { PrintSheet } from './print-sheet';
import { arrangeSlots, constrainSlot, slotSize, slotsOverlap, type PrintSlot } from './print-layout';

type SavedProduct = { id:string; name:string; data:Json; layout:Json; theme:string; updated_at:string; inventory_item_id?:string|null };
type SavedTemplate = Database['public']['Tables']['label_templates']['Row'];
const initialDocument: DocumentState = { product:sampleProduct, elements:defaultElements, theme:'mint' };
const fmtNumber=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(n)||0);
const stockStatus=(i:InventoryItem)=>i.quantity<=0?'out':i.quantity<=i.min_quantity?'low':'in';
function matchesSearch(p:SavedProduct,item:InventoryItem|undefined,query:string){
  const q=query.trim().toLowerCase();if(!q)return true;
  const d=p.data as unknown as Partial<Product>;
  return [p.name,d.model,d.barcode,d.color,item?.sku,item?.category].some(v=>typeof v==='string' && v.toLowerCase().includes(q));
}
function ProductStock({item,u}:{item:InventoryItem|undefined;u:(typeof ui)['ar']}){
  if(!item)return <p className="product-stock muted">{u.linkedMissing}</p>;
  return <Link to="/inventory" className="product-stock"><span className={`inv-badge-inline inv-${stockStatus(item)}`}>{u.quantity}: <b dir="ltr">{item.quantity}</b></span><span>{u.price}: <b dir="ltr">{fmtNumber(item.price)}</b></span></Link>;
}
function persistDraft(doc:DocumentState,productId:string|null,inventoryId:string|null){
  sessionStorage.setItem(DRAFT_KEY,JSON.stringify(doc));
  if(productId)sessionStorage.setItem(DRAFT_PRODUCT_ID_KEY,productId);else sessionStorage.removeItem(DRAFT_PRODUCT_ID_KEY);
  if(inventoryId)sessionStorage.setItem(DRAFT_INVENTORY_ID_KEY,inventoryId);else sessionStorage.removeItem(DRAFT_INVENTORY_ID_KEY);
}
const layerIcons: Record<ElementKind, typeof Type> = {store:Tag,name:Type,model:Type,photo:ImagePlus,details:FileText,specs:FileText,warranty:ShieldCheck,barcode:BarcodeIcon,footer:Type,text:Type,line:Minus};

function IconButton({ label, children, onClick, disabled=false, active=false, className='' }: { label:string; children:ReactNode; onClick?:()=>void; disabled?:boolean; active?:boolean; className?:string }) {
  return <Button variant="ghost" size="icon" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`tool-icon ${active?'selected':''} ${className}`}>{children}</Button>;
}

export function LabelEditor({ view='editor' }: { view?:'editor'|'products'|'templates' }) {
  const navigate = useNavigate();
  const {user,language,can}=useSession();
  const t=words[language];
  const [document,setDocument]=useState<DocumentState>(initialDocument);
  const [selected,setSelected]=useState('name');
  const [panelTab,setPanelTab]=useState<'data'|'design'>('data');
  const [zoom,setZoom]=useState(90);
  const [history,setHistory]=useState<DocumentState[]>([]);
  const [future,setFuture]=useState<DocumentState[]>([]);
  const [dirty,setDirty]=useState(false);
  const [busy,setBusy]=useState(false);
  const [products,setProducts]=useState<SavedProduct[]>([]);
  const [productId,setProductId]=useState<string|null>(null);
  const [inventoryId,setInventoryId]=useState<string|null>(null);
  const [linkedItem,setLinkedItem]=useState<InventoryItem|null|undefined>(undefined);
  const [stock,setStock]=useState<Record<string,InventoryItem>>({});
  const [templates,setTemplates]=useState<SavedTemplate[]|null>(null);
  const [tplName,setTplName]=useState('');
  const [tplMissing,setTplMissing]=useState(false);
  const [pickerOpen,setPickerOpen]=useState(false);
  const u=ui[language];
  const [search,setSearch]=useState('');
  const [scanOpen,setScanOpen]=useState(false);
  const [printOpen,setPrintOpen]=useState(false);
  const [copies,setCopies]=useState(1);
  const [paper,setPaper]=useState<'a4'|'a7'>('a4');
  const [slots,setSlots]=useState<PrintSlot[]>(()=>arrangeSlots(1));
  const [selectedSlot,setSelectedSlot]=useState(0);
  const activeSlot=slots[selectedSlot] ?? {x:0,y:0,rotated:false};
  const pt=language==='ar'?{paper:'ورق الطباعة',position:'موضع الملصق',rotate:'تدوير',arrange:'ترتيب تلقائي',color:'لون النص',weight:'سمك الخط',format:'نوع الرمز',edge:'التوزيع من 5 إلى 8 ملصقات يحتاج طباعة بلا حواف؛ اختر A4 وحجم 100% في نافذة الطباعة.',overlap:'توجد ملصقات متداخلة',sheet:'ورقة',edit:'تعديل النص',slotProduct:'ملصق هذه الخانة',current:'المنتج الحالي',addProduct:'إضافة منتج للورقة',removeSlot:'حذف الخانة'}:{paper:'کاغەزی چاپ',position:'شوێنی لیبڵ',rotate:'سوڕاندنەوە',arrange:'ڕیزکردنی خۆکار',color:'ڕەنگی دەق',weight:'ئەستووری فۆنت',format:'جۆری کۆد',edge:'بۆ 5 تا 8 لیبڵ چاپی بێ پەراوێز پێویستە؛ A4 و قەبارەی 100% هەڵبژێرە.',overlap:'لیبڵەکان لەسەر یەکترن',sheet:'کاغەز',edit:'دەستکاری دەق',slotProduct:'لیبڵی ئەم خانەیە',current:'بەرهەمی ئێستا',addProduct:'زیادکردنی بەرهەم بۆ لاپەڕەکە',removeSlot:'سڕینەوەی خانە'};
  const rt=language==='ar'?{grow:'تكبير العنصر',shrink:'تصغير العنصر',width:'العرض',height:'الارتفاع',codeSize:'حجم الباركود'}:{grow:'گەورەکردنی توخم',shrink:'بچووککردنەوەی توخم',width:'پانی',height:'بەرزی',codeSize:'قەبارەی بارکۆد'};
  function changeCopies(value:number){const n=Math.max(1,Math.min(50,Math.round(value)||1));setCopies(n);setSlots(ss=>arrangeSlots(Math.min(n,8)).map((f,i)=>ss[i]?.productId?{...f,productId:ss[i].productId}:f));setSelectedSlot(0);}
  function patchSlot(patch:Partial<PrintSlot>){setSlots(ss=>ss.map((slot,i)=>i===selectedSlot?constrainSlot({...slot,...patch}):slot));}
  function docFromSaved(p:SavedProduct):DocumentState|null{const result=productSchema.safeParse(p.data);if(!result.success||!Array.isArray(p.layout))return null;return {product:result.data,elements:p.layout as unknown as LabelElement[],theme:p.theme};}
  const docsById=useMemo(()=>{const m=new Map<string,DocumentState>();for(const p of products){const d=docFromSaved(p);if(d)m.set(p.id,d);}return m;},[products]);
  function slotDoc(pid:string):DocumentState|null{return docsById.get(pid) ?? null;}
  function assignSlotProduct(pid:string){if(!pid){patchSlot({productId:undefined});return;}if(!slotDoc(pid)){toast.error(t.failure);return;}patchSlot({productId:pid});}
  function addProductSlot(pid:string){if(!pid||slots.length>=8)return;if(!slotDoc(pid)){toast.error(t.failure);return;}setSlots(ss=>[...ss,{...(arrangeSlots(ss.length+1)[ss.length] ?? {x:0,y:0,rotated:false}),productId:pid}]);setCopies(slots.length+1);setSelectedSlot(slots.length);}
  function removeSlot(){if(slots.length<=1)return;setSlots(ss=>ss.filter((_,i)=>i!==selectedSlot));setCopies(c=>Math.max(1,c-1));setSelectedSlot(i=>Math.max(0,i-1));}
  function editLabel(id:string,value:string,field?:keyof Product){update({...docRef.current,...(field?{product:{...docRef.current.product,[field]:value}}:{elements:docRef.current.elements.map(el=>el.id===id?{...el,text:value}:el)})});}
  const [hydrated,setHydrated]=useState(false);
  const [template,setTemplate]=useState('classic');
  const fileRef=useRef<HTMLInputElement>(null);
  const stageRef=useRef<HTMLDivElement>(null);
  // Shrink the label to fit narrow (phone) screens; wide screens keep the default zoom.
  useEffect(()=>{
    const fit=()=>{const w=stageRef.current?.clientWidth;if(!w)return;const max=Math.floor((w-64)/350*100/5)*5;setZoom(z=>max<z?Math.max(50,max):z);};
    fit();window.addEventListener('resize',fit);return()=>window.removeEventListener('resize',fit);
  },[view]);
  const dragStart=useRef<DocumentState|null>(null);
  const docRef=useRef(document); docRef.current=document;
  const current=document.elements.find(el=>el.id===selected);

  useEffect(()=>{
    setHydrated(true);
    try { const draft=JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); if(draft && productSchema.safeParse(draft.product).success && Array.isArray(draft.elements)) {setDocument(draft);setProductId(sessionStorage.getItem(DRAFT_PRODUCT_ID_KEY));setInventoryId(sessionStorage.getItem(DRAFT_INVENTORY_ID_KEY));} } catch { /* Ignore invalid drafts. */ }
  },[]);
  useEffect(()=>{ if(hydrated) persistDraft(document,productId,inventoryId); },[document,hydrated,productId,inventoryId]);
  useEffect(()=>{
    if(!user){setProducts([]);return;}
    void (async()=>{const q=await hasLinkColumn()?supabase.from('label_products').select('id,name,data,layout,theme,updated_at,inventory_item_id'):supabase.from('label_products').select('id,name,data,layout,theme,updated_at');const {data,error}=await q.order('updated_at',{ascending:false});if(error)toast.error(t.failure);else setProducts(data || []);})();
  },[user,view,t.failure]);
  useEffect(()=>{
    if(!inventoryId || !can('inventory.view')){setLinkedItem(null);return;}
    if(linkedItem?.id===inventoryId)return;
    setLinkedItem(undefined);
    supabase.from('inventory_items').select('*').eq('id',inventoryId).maybeSingle().then(({data})=>setLinkedItem(data));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[inventoryId,can]);
  useEffect(()=>{
    if(!user||view!=='templates'||!can('labels.design')){setTemplates(null);return;}
    void (async()=>{const {data,error}=await supabase.from('label_templates').select('*').order('updated_at',{ascending:false});
      if(error){setTplMissing(true);setTemplates([]);return;}
      setTplMissing(false);setTemplates(data??[]);})();
  },[user,view,can]);
  useEffect(()=>{
    const ids=[...new Set(products.map(p=>p.inventory_item_id).filter((x):x is string=>!!x))];
    if(view!=='products' || !ids.length || !can('inventory.view')){setStock({});return;}
    supabase.from('inventory_items').select('*').in('id',ids).then(({data})=>setStock(Object.fromEntries((data ?? []).map(i=>[i.id,i]))));
  },[products,view,can]);
  function update(next:DocumentState,record=true) {
    if(record){setHistory(h=>[...h.slice(-39),docRef.current]);setFuture([]);}
    setDocument(next);setDirty(true);
  }
  function setField(key:keyof Product,value:string){update({...document,product:{...document.product,[key]:value}});}
  function patchElement(patch:Partial<LabelElement>){update({...document,elements:document.elements.map(el=>el.id===selected?{...el,...patch}:el)});}
  const scrubDoc=useRef<DocumentState|null>(null);
  function scrubFont(n:number){if(!current||!selected)return;if(!scrubDoc.current)scrubDoc.current=docRef.current;update({...document,elements:document.elements.map(el=>el.id===selected?{...el,fontSize:n}:el)},false);}
  function commitScrub(){const s=scrubDoc.current;if(!s)return;scrubDoc.current=null;setHistory(h=>[...h.slice(-39),s]);setFuture([]);}
  function commitFont(v:string,el?:HTMLInputElement){const d=current?.fontSize||(current?.kind==='name'?23:11);const n=Number(v);if(!current)return;if(!v.trim()||!Number.isFinite(n)){if(el)el.value=String(d);return;}const c=Math.max(8,Math.min(40,Math.round(n)));if(c!==d)patchElement({fontSize:c});else if(el)el.value=String(c);}
  function scaleElement(factor:number){
    if(!current)return;
    const width=Math.round(Math.max(20,Math.min(350,current.width*factor)));
    const height=Math.round(Math.max(12,Math.min(489,current.height*factor)));
    const x=Math.round(Math.max(0,Math.min(350-width,current.x-(width-current.width)/2)));
    const y=Math.round(Math.max(8,Math.min(497-height,current.y-(height-current.height)/2)));
    patchElement({width,height,x,y,...(current.fontSize?{fontSize:Math.max(8,Math.min(40,Math.round(current.fontSize*factor)))}:{})});
  }
  function move(id:string,x:number,y:number,commit:boolean){
    if(!dragStart.current)dragStart.current=docRef.current;
    setDocument(d=>({...d,elements:d.elements.map(el=>el.id===id?{...el,x,y}:el)}));setDirty(true);
    if(commit){const start=dragStart.current;if(start)setHistory(h=>[...h.slice(-39),start]);setFuture([]);dragStart.current=null;}
  }
  function undo(){const previous=history.at(-1);if(!previous)return;setFuture(f=>[document,...f]);setDocument(previous);setHistory(h=>h.slice(0,-1));setDirty(true);}
  function redo(){const next=future[0];if(!next)return;setHistory(h=>[...h,document]);setDocument(next);setFuture(f=>f.slice(1));setDirty(true);}
  function addElement(kind:ElementKind,at?:{x:number;y:number}){
    const id=crypto.randomUUID();const width=kind==='photo'?150:290,height=kind==='photo'?130:kind==='barcode'?50:36;
    const x=at?Math.round(Math.max(0,Math.min(350-width,at.x-width/2))):30,y=at?Math.round(Math.max(8,Math.min(497-height,at.y-height/2))):190;
    update({...document,elements:[...document.elements,{id,kind,x,y,width,height,visible:true,text:t.customText}]});setSelected(id);
  }
  function dropElement(e:React.DragEvent<HTMLDivElement>){
    e.preventDefault();const kind=e.dataTransfer.getData('label-element');
    if(!['text','photo','barcode','line','warranty','specs'].includes(kind))return;
    const rect=e.currentTarget.querySelector('.label-paper')?.getBoundingClientRect();
    addElement(kind as ElementKind,rect?{x:(e.clientX-rect.left)/(rect.width/350),y:(e.clientY-rect.top)/(rect.height/497)}:undefined);
  }
  function newProduct(){const next={product:{...sampleProduct,name:'',model:'',color:'',size:'',specs:'',warranty:'',barcode:'',store:document.product.store,image:''},elements:defaultElements,theme:'mint'};update(next);setProductId(null);setInventoryId(null);setSelected('name');setSlots(ss=>ss.map(s=>({...s,productId:undefined})));persistDraft(next,null,null);navigate({to:'/'});}
  function openProduct(p:SavedProduct,stay=false){const result=productSchema.safeParse(p.data);if(!result.success || !Array.isArray(p.layout)){toast.error(t.failure);return;}const next={product:result.data,elements:p.layout as unknown as LabelElement[],theme:p.theme};setDocument(next);if(p.id!==productId){setSlots(ss=>ss.map(s=>({...s,productId:undefined})));setSelectedSlot(0);}setProductId(p.id);setInventoryId(p.inventory_item_id ?? null);setHistory([]);setFuture([]);setDirty(false);persistDraft(next,p.id,p.inventory_item_id ?? null);if(!stay)navigate({to:'/'});}
  function applyItem(item:InventoryItem){const product=productFromItem(item,document.product);update({...document,product,elements:fitBarcodeElement(document.elements,document.product.codeFormat,product.codeFormat)});setInventoryId(item.id);setLinkedItem(item);setPickerOpen(false);}
  async function createItem(){
    const p=document.product;
    if(!p.name.trim()){toast.error(t.invalid);return;}
    setBusy(true);
    const {data,error}=await supabase.from('inventory_items').insert({name:p.name.trim(),model:p.model,color:p.color,size:p.size,warranty:p.warranty,specs:p.specs,image:p.image,barcode:p.barcode,sku:'',category:'',location:'',notes:'',price:0,cost:0,quantity:0,min_quantity:0}).select('*').single();
    setBusy(false);
    if(error){toast.error(t.failure);return;}
    setInventoryId(data.id);setLinkedItem(data);setDirty(true);toast.success(u.createdLinked);
  }
  async function save(mode:'insert'|'update'='insert'){
    if(!productSchema.safeParse(document.product).success){toast.error(t.invalid);return;}
    if(!user || !can('labels.save'))return;
    if(mode==='update'&&!productId)mode='insert';
    setBusy(true);
    const payload:Database['public']['Tables']['label_products']['Insert']={user_id:user.id,name:document.product.name,data:document.product as unknown as Json,layout:document.elements as unknown as Json,theme:document.theme,updated_at:new Date().toISOString()};
    if(await hasLinkColumn())payload.inventory_item_id=inventoryId;
    const {data,error}=mode==='update'?await supabase.from('label_products').update(payload).eq('id',productId!).select().single():await supabase.from('label_products').insert(payload).select().single();
    setBusy(false);if(error){toast.error(t.failure);return;}setProductId(data.id);setDirty(false);setProducts(ps=>[data as SavedProduct,...ps.filter(x=>x.id!==data.id)]);toast.success(mode==='update'?t.updatedToast:t.savedToast);
  }
  async function removeProduct(id:string){if(!window.confirm(language==='ar'?'هل تريد حذف هذا المنتج؟':'ئایا ئەم بەرهەمە دەسڕیتەوە؟'))return;const {error}=await supabase.from('label_products').delete().eq('id',id);if(error)toast.error(t.failure);else{setProducts(p=>p.filter(x=>x.id!==id));setSlots(ss=>ss.map(s=>s.productId===id?{...s,productId:undefined}:s));}}
  function applyTemplate(key:string){setTemplate(key);update({...document,elements:defaultElements.map(el=>key==='compact'?{...el,visible:el.kind!=='photo',y:el.kind==='details'?150:el.kind==='specs'?205:el.kind==='warranty'?280:el.kind==='barcode'?335:el.y}:el)});}
  function applyCustomTemplate(tpl:SavedTemplate){setTemplate('');update({...document,elements:tpl.elements as unknown as LabelElement[],theme:tpl.theme,product:{...document.product,store:tpl.store||document.product.store}});}
  async function saveTemplate(name:string){
    if(!user||!name.trim()){toast.error(t.invalid);return;}
    const {error}=await supabase.from('label_templates').insert({name:name.trim(),elements:document.elements as unknown as Json,theme:document.theme,store:document.product.store,user_id:user.id});
    if(error){toast.error(t.failure);return;}
    toast.success(u.templateSaved);setTplName('');
    const {data}=await supabase.from('label_templates').select('*').order('updated_at',{ascending:false});setTemplates(data??[]);
  }
  async function saveProductTemplate(p:SavedProduct){
    if(!user)return;
    const {error}=await supabase.from('label_templates').insert({name:p.name,elements:p.layout,theme:p.theme,store:(p.data as unknown as Product).store||'',user_id:user.id});
    if(error){toast.error(t.failure);return;}toast.success(u.templateSaved);
  }
  async function deleteTemplate(id:string){if(!window.confirm(u.confirmDeleteTemplate))return;const {error}=await supabase.from('label_templates').delete().eq('id',id);if(error)toast.error(t.failure);else setTemplates(ts=>(ts??[]).filter(x=>x.id!==id));}
  async function renameTemplate(tpl:SavedTemplate){const name=window.prompt(u.templateName,tpl.name)?.trim();if(!name)return;const {error}=await supabase.from('label_templates').update({name,updated_at:new Date().toISOString()}).eq('id',tpl.id);if(error)toast.error(t.failure);else setTemplates(ts=>(ts??[]).map(x=>x.id===tpl.id?{...x,name}:x));}
  async function upload(file:File|undefined){if(!file)return;if(file.size>2000000 || !['image/png','image/jpeg','image/webp'].includes(file.type)){toast.error(language==='ar'?'اختر صورة JPG أو PNG أو WebP أصغر من 2MB':'وێنەی JPG، PNG یان WebP کەمتر لە 2MB هەڵبژێرە');return;}const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==='string')setField('image',reader.result);};reader.readAsDataURL(file);}
  function doPrint(){if(paper==='a4' && slotsOverlap(slots)){toast.error(pt.overlap);return;}if(!productSchema.safeParse(document.product).success){toast.error(t.invalid);return;}setSelected('');window.print();}
  const field=(key:keyof Product,label:string,ltr=false,required=false)=><label className="field"><span className="field-label">{label}{required&&<span className="required">*</span>}</span><input aria-label={label} maxLength={key==='barcode'?(document.product.codeFormat==='qr'?500:40):120} className="field-input" dir={ltr?'ltr':'rtl'} value={document.product[key]} onChange={e=>setField(key,e.target.value)} placeholder={label}/></label>;
  const layerName=(kind:ElementKind)=>({store:t.store,name:t.name,model:t.model,photo:t.photo,details:`${t.color} / ${t.size}`,specs:t.specs,warranty:t.warranty,barcode:t.barcode,footer:t.text,text:t.text,line:t.line})[kind];
  const slotDocuments=slots.map(s=>s.productId?(docsById.get(s.productId) ?? document):document);
  const templatePicker=<div className="template-grid">{([['classic',t.standard],['compact',t.compact]] as const).map(([key,label])=><Button key={key} variant="ghost" className={`template-choice ${template===key?'active':''}`} onClick={()=>applyTemplate(key)}><span className="template-mini"><i/><i/><b/><i/><i/></span>{label}</Button>)}</div>;

  return <AppShell active={view}>
    {view==='products'?<main className="library"><div className="library-top"><h1>{t.library}</h1>{can('labels.design') && <Button onClick={newProduct}><Plus/>{t.newProduct}</Button>}</div><div className="library-search"><input className="field-input max-w-sm" value={search} onChange={e=>setSearch(e.target.value)} aria-label={u.searchProducts} placeholder={u.searchProducts}/><Button variant="outline" size="icon" aria-label={u.scan} title={u.scan} onClick={()=>setScanOpen(true)}><ScanLine/></Button></div>{products.length===0?<div className="empty-library"><Package/><h2>{t.empty}</h2><p>{t.emptyText}</p><Button className="mt-5" onClick={()=>navigate({to:'/'})}>{t.newProduct}<Plus/></Button></div>:<div className="library-grid">{products.filter(p=>matchesSearch(p,stock[p.inventory_item_id ?? ''],search)).map(p=><article key={p.id} className="product-card">{(p.data as unknown as Product).image?<img src={(p.data as unknown as Product).image} alt={p.name}/>:p.name==='سماعات لاسلكية'?<img src={headphones} alt={p.name}/>:<div className="flex h-36 items-center justify-center bg-muted"><Tag className="size-10 text-primary"/></div>}<div className="product-card-content"><h2>{p.name}</h2><p dir="ltr">{(p.data as unknown as Product).model}</p>{p.inventory_item_id && can('inventory.view') && <ProductStock item={stock[p.inventory_item_id]} u={u}/>}<div className="mt-4 flex items-center gap-2">{can('labels.design') && <Button variant="outline" onClick={()=>openProduct(p)}>{t.edit}<ArrowLeft/></Button>}{can('labels.print') && <IconButton label={t.print} onClick={()=>{openProduct(p,true);setPrintOpen(true);}}><Printer/></IconButton>}{can('labels.save') && <IconButton label={u.saveAsTemplate} onClick={()=>saveProductTemplate(p)}><LayoutTemplate/></IconButton>}{can('labels.delete') && <IconButton label={t.delete} onClick={()=>removeProduct(p.id)}><Trash2/></IconButton>}</div></div></article>)}</div>}</main>:<>
    <section className="editor-heading"><div><h1>{view==='templates'?t.templates:t.heading}</h1><p>{t.description}</p></div><div className="heading-actions"><span className="saved-indicator"><CheckCheck size={14}/>{dirty?t.unsaved:t.saved}</span>{can('labels.save') && <Button variant="outline" onClick={()=>save()} disabled={busy}>{busy?<LoaderCircle className="animate-spin"/>:<Save/>}{t.save}</Button>}{productId && can('labels.save') && <Button variant="outline" onClick={()=>save('update')} disabled={busy}>{busy?<LoaderCircle className="animate-spin"/>:<RefreshCw/>}{t.update}</Button>}{can('labels.print') && <Button onClick={()=>setPrintOpen(true)}><Printer/>{t.print}</Button>}</div></section>
    <main className="editor-shell">
      <aside className="panel product-panel"><div className="panel-tabs"><Button variant="ghost" className={`panel-tab ${panelTab==='data' && view!=='templates'?'active':''}`} onClick={()=>setPanelTab('data')}>{t.data}</Button><Button variant="ghost" className={`panel-tab ${panelTab==='design' || view==='templates'?'active':''}`} onClick={()=>setPanelTab('design')}>{t.design}</Button></div><div className="panel-inner">{panelTab==='data' && view!=='templates'?<><div className="panel-title">{t.info}<IconButton label={t.newProduct} onClick={newProduct}><Plus/></IconButton></div>{can('inventory.view') && <div className="link-card">{!inventoryId ? <><Button variant="outline" className="w-full" onClick={()=>setPickerOpen(true)}><Boxes/>{u.linkInventory}</Button>{can('inventory.create') && <Button variant="ghost" className="w-full" onClick={createItem} disabled={busy}><Plus/>{u.createInInventory}</Button>}</> : linkedItem===undefined ? <LoaderCircle className="mx-auto animate-spin text-muted-foreground"/> : <>
        <div className="link-card-head"><Link2 size={14}/><b>{u.linkedTo}</b><button type="button" className="link-card-change" onClick={()=>setPickerOpen(true)}>{u.pickItem}</button></div>
        {linkedItem ? <div className="link-card-item"><span>{linkedItem.name}</span><span className={`inv-badge-inline inv-${stockStatus(linkedItem)}`}>{u.quantity}: <b dir="ltr">{linkedItem.quantity}</b></span></div> : <p className="link-card-missing">{u.linkedMissing}</p>}
        <div className="link-card-actions">{linkedItem && <Button size="sm" variant="outline" onClick={()=>{applyItem(linkedItem);toast.success(u.refreshed);}}><RefreshCw/>{u.refreshFromInventory}</Button>}<Button size="sm" variant="ghost" onClick={()=>{setInventoryId(null);setDirty(true);}}><Unlink/>{u.unlink}</Button></div>
      </>}</div>}{field('name',t.name,false,true)}{field('model',t.model,true)}<div className="field-row">{field('color',t.color)}{field('size',t.size)}</div><label className="field"><span className="field-label">{t.specs}</span><textarea className="field-input" aria-label={t.specs} maxLength={500} value={document.product.specs} onChange={e=>setField('specs',e.target.value)}/></label>{field('warranty',t.warranty)}<label className="field"><span className="field-label">{pt.format}</span><select className="field-input" aria-label={pt.format} value={document.product.codeFormat || 'code128'} onChange={e=>{const qr=e.target.value==='qr';update({...document,product:{...document.product,codeFormat:qr?'qr':'code128'},elements:document.elements.map(el=>el.kind==='barcode'?{...el,width:qr?60:270,height:qr?60:45,x:qr?145:40,y:qr?418:427}:el)});}}><option value="code128">CODE 128</option><option value="qr">QR Code</option></select></label>{field('barcode',t.barcode,true,true)}<span className="field-label">{t.photo}</span><div className="photo-row"><img src={document.product.image || headphones} alt={t.photo} width={45} height={45}/><div><p>{t.photo}</p><span>JPG, PNG, WebP</span></div><IconButton label={t.changePhoto} onClick={()=>fileRef.current?.click()}><Upload/></IconButton></div><input type="file" hidden ref={fileRef} accept="image/png,image/jpeg,image/webp" onChange={e=>upload(e.target.files?.[0])}/></>:<><div className="panel-title">{t.templates}<LayoutTemplate size={16}/></div>{templatePicker}<div className="mt-6">{field('store',t.store)}</div><div className="section-title">{t.colors}</div><div className="swatches">{['mint','blue','rose','silver'].map(color=><Button key={color} variant="ghost" title={color} aria-label={color} className={`swatch ${color} ${document.theme===color?'active':''}`} onClick={()=>update({...document,theme:color})}/>)}</div><Button variant="outline" className="mt-6 w-full" onClick={()=>update({...document,elements:defaultElements})}><RotateCcw/>{t.reset}</Button>{can('labels.save') && !tplMissing && <div className="tpl-save"><div className="section-title">{u.saveCurrentAsTemplate}</div><div className="tpl-save-row"><input className="field-input" maxLength={60} value={tplName} onChange={e=>setTplName(e.target.value)} placeholder={u.templateName} aria-label={u.templateName}/><Button size="sm" className="shrink-0" onClick={()=>saveTemplate(tplName)}><Save/>{u.save}</Button></div></div>}{templates && templates.length>0 && <><div className="section-title mt-5">{u.myTemplates}</div><div className="tpl-grid">{templates.map(tpl=><div className="tpl-card" key={tpl.id}><button type="button" className="tpl-preview" title={tpl.name} onClick={()=>applyCustomTemplate(tpl)}><span className="tpl-preview-inner"><LabelCanvas document={{product:{...sampleProduct,store:tpl.store||sampleProduct.store},elements:tpl.elements as unknown as LabelElement[],theme:tpl.theme}} language={language} printing/></span></button><div className="tpl-card-foot"><b>{tpl.name}</b><span className="tpl-card-actions">{can('labels.save') && <IconButton label={u.renameTemplate} onClick={()=>renameTemplate(tpl)}><Pencil/></IconButton>}{can('labels.delete') && <IconButton label={u.deleteTemplate} onClick={()=>deleteTemplate(tpl.id)}><Trash2/></IconButton>}</span></div></div>)}</div></>}{templates && templates.length===0 && !tplMissing && <p className="tpl-hint">{u.noCustomTemplates}</p>}</>}</div></aside>
      <section className="workspace"><div className="canvas-toolbar"><div className="tool-cluster"><IconButton label={language==='ar'?'تحديد':'دیاریکردن'} active><MousePointer2/></IconButton><span className="tool-divider"/><IconButton label={language==='ar'?'تراجع':'پاشگەزبوونەوە'} onClick={undo} disabled={!history.length}><Undo2/></IconButton><IconButton label={language==='ar'?'إعادة':'دووبارەکردنەوە'} onClick={redo} disabled={!future.length}><Redo2/></IconButton><span className="tool-divider"/><IconButton label="Bold" onClick={()=>current && patchElement({bold:!current.bold,fontWeight:current.bold?400:750})} active={current?.bold ?? false} disabled={!current} className="optional-tool"><Bold/></IconButton><IconButton label="Align center" onClick={()=>patchElement({align:'center'})} disabled={!current} className="optional-tool"><AlignCenter/></IconButton><span className="tool-divider"/><IconButton label={rt.shrink} onClick={()=>scaleElement(1/1.1)} disabled={!current}><ZoomOut/></IconButton><IconButton label={rt.grow} onClick={()=>scaleElement(1.1)} disabled={!current}><ZoomIn/></IconButton><IconButton label={t.delete} disabled={!current} onClick={()=>{update({...document,elements:document.elements.filter(el=>el.id!==selected)});setSelected('');}}><Trash2/></IconButton></div><select className="paper-select" aria-label="حجم الورقة" value="A7" onChange={()=>{}}><option value="A7">A7 · 74 × 105 mm</option></select></div>
      <div ref={stageRef} className="canvas-stage" onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';}} onDrop={dropElement}><div className="paper-frame" style={{width:350*zoom/100,height:497*zoom/100} as CSSProperties}><div className="paper-size-top">74 mm</div><div className="paper-size-side">105 mm</div><div style={{transform:`scale(${zoom/100})`,transformOrigin:'top left'}}><LabelCanvas document={document} language={language} selected={selected} onSelect={setSelected} onMove={move} onTextChange={editLabel}/></div></div></div>
      <div className="canvas-footer"><span>A7 <span className="mx-2">·</span> 74 × 105 mm <span className="mx-2">·</span> {t.portrait}</span><div className="zoom-control"><IconButton label="Zoom out" onClick={()=>setZoom(z=>Math.max(50,z-10))}><Minus/></IconButton><span>{zoom}%</span><IconButton label="Zoom in" onClick={()=>setZoom(z=>Math.min(130,z+10))}><Plus/></IconButton><span className="tool-divider"/><IconButton label="Fit" onClick={()=>setZoom(90)}><Maximize/></IconButton></div></div></section>
      <aside className="panel inspector"><div className="inspector-heading"><Settings2 size={15}/>{t.elements}</div><section className="inspector-section"><h2 className="section-title">{t.add}<Plus size={13}/></h2><div className="element-grid">{([['text',Type,t.text],['photo',ImagePlus,t.image],['barcode',BarcodeIcon,t.barcode],['line',Minus,t.line],['warranty',ShieldCheck,t.warranty],['specs',FileText,t.specs]] as const).map(([kind,Icon,label])=><Button key={kind} variant="ghost" className="add-element" onClick={()=>addElement(kind)} draggable onDragStart={e=>e.dataTransfer.setData('label-element',kind)}><Icon/>{label}</Button>)}</div></section>
      <section className="inspector-section"><h2 className="section-title">{t.layers}<Layers size={14}/></h2><div className="layer-list">{document.elements.filter(el=>el.kind!=='footer').map(el=>{const Icon=layerIcons[el.kind];return <div className={`layer-row ${selected===el.id?'active':''}`} key={el.id}><GripVertical className="text-muted-foreground"/><Icon/><Button variant="ghost" className="layer-name h-7 justify-start p-0 text-[10px]" onClick={()=>setSelected(el.id)}>{layerName(el.kind)}</Button><Button variant="ghost" size="icon" className="layer-toggle" aria-label={`${el.visible?t.hide:t.show} ${layerName(el.kind)}`} onClick={()=>update({...document,elements:document.elements.map(x=>x.id===el.id?{...x,visible:!x.visible}:x)})}>{el.visible?<Eye className="text-muted-foreground"/>:<EyeOff/>}</Button></div>;})}</div></section>
      <section className="inspector-section"><h2 className="section-title">{current?t.selected:t.colors}<Sparkles size={13}/></h2>{current?<><div className="field-row"><label className="field"><span className="field-label">X</span><input type="number" aria-label="X" className="field-input" dir="ltr" value={current.x} min={0} max={350-current.width} onChange={e=>patchElement({x:Math.max(0,Math.min(350-current.width,Number(e.target.value)))})}/></label><label className="field"><span className="field-label">Y</span><input type="number" aria-label="Y" className="field-input" dir="ltr" value={current.y} min={8} max={497-current.height} onChange={e=>patchElement({y:Math.max(8,Math.min(497-current.height,Number(e.target.value)))})}/></label></div><div className="field-row"><label className="field"><span className="field-label">{rt.width}</span><input type="number" aria-label={rt.width} className="field-input" dir="ltr" value={current.width} min={20} max={350-current.x} onChange={e=>patchElement({width:Math.max(20,Math.min(350-current.x,Number(e.target.value)||20)),...(current.kind==='barcode' && document.product.codeFormat==='qr'?{height:Math.max(20,Math.min(497-current.y,Number(e.target.value)||20))}:{})})}/></label><label className="field"><span className="field-label">{rt.height}</span><input type="number" aria-label={rt.height} className="field-input" dir="ltr" value={current.height} min={12} max={497-current.y} onChange={e=>patchElement({height:Math.max(12,Math.min(497-current.y,Number(e.target.value)||12))})}/></label></div>{current.kind==='barcode' && <div className="resize-row"><span className="field-label">{rt.codeSize}</span><div className="zoom-control"><IconButton label={rt.shrink} onClick={()=>scaleElement(1/1.1)}><Minus/></IconButton><span dir="ltr">{current.width} × {current.height}</span><IconButton label={rt.grow} onClick={()=>scaleElement(1.1)}><Plus/></IconButton></div></div>}{current.kind==='text' && <input aria-label={t.text} className="field-input mb-3" value={current.text || ''} maxLength={120} onChange={e=>patchElement({text:e.target.value})}/>}<label className="field mt-3"><span className="field-label">{pt.color}</span><div className="swatches">{(['ink','muted','green','red','blue'] as const).map(color=><Button key={color} variant="ghost" aria-label={`${pt.color} ${color}`} title={color} className={`swatch text-swatch ink-${color} ${current.textColor===color?'active':''}`} onClick={()=>patchElement({textColor:color})}/>)}</div></label><label className="field"><span className="field-label">{pt.weight}</span><input aria-label={pt.weight} type="range" min={300} max={900} step={50} value={current.fontWeight ?? (current.bold || current.kind==='name'?750:400)} onChange={e=>patchElement({fontWeight:Number(e.target.value),bold:Number(e.target.value)>=700})}/></label><div className="fs-block"><div className="fs-top"><label className="text-[10px]">{t.sizeFont}</label><input key={current.fontSize || (current.kind==='name'?23:11)} className="field-input" type="text" inputMode="numeric" pattern="[0-9]*" dir="ltr" aria-label={t.sizeFont} defaultValue={current.fontSize || (current.kind==='name'?23:11)} onFocus={e=>e.target.select()} onBlur={e=>commitFont(e.target.value,e.currentTarget)} onKeyDown={e=>{if(e.key==='Enter')commitFont(e.currentTarget.value,e.currentTarget);else if(e.key==='Escape'){e.currentTarget.value=String(current.fontSize||(current.kind==='name'?23:11));e.currentTarget.blur();}}}/></div><input type="range" dir="ltr" className="fs-slider" min={8} max={40} step={1} aria-label={t.sizeFont} value={current.fontSize || (current.kind==='name'?23:11)} onChange={e=>scrubFont(Number(e.target.value))} onPointerUp={commitScrub} onTouchEnd={commitScrub} onKeyUp={commitScrub}/></div></>:<div className="swatches">{['mint','blue','rose','silver'].map(color=><Button key={color} variant="ghost" title={color} aria-label={color} className={`swatch ${color} ${document.theme===color?'active':''}`} onClick={()=>update({...document,theme:color})}/>)}</div>}</section></aside>
    </main><footer className="below-editor"><span><span className="status-dot"/>{t.ready}</span><span>{document.product.codeFormat==='qr'?'QR Code':'CODE 128'} <span className="mx-2">·</span> A7 / ISO 216</span></footer></>}
    {pickerOpen && <InventoryPicker onClose={()=>setPickerOpen(false)} onPick={applyItem}/>}
    {scanOpen && <Dialog open onOpenChange={o=>{if(!o)setScanOpen(false);}}><DialogContent dir="rtl" className="scan-dialog"><DialogHeader><DialogTitle>{u.scanTitle}</DialogTitle><DialogDescription>{u.scanHint}</DialogDescription></DialogHeader><BarcodeScanner onResult={text=>{setSearch(text);setScanOpen(false);toast.success(u.scanFoundShort);}} onError={err=>{setScanOpen(false);toast.error(isCameraDenied(err)?u.cameraDenied:u.cameraError);}}/></DialogContent></Dialog>}
    <Dialog open={printOpen} onOpenChange={setPrintOpen}><DialogContent dir="rtl" className="print-dialog"><DialogHeader><DialogTitle>{t.preview}</DialogTitle><DialogDescription>{paper==='a4'?'A4 · 210 × 297 mm':'A7 · 74 × 105 mm'}</DialogDescription></DialogHeader><div className="print-controls"><label className="field"><span className="field-label">{pt.paper}</span><select aria-label={pt.paper} className="field-input" value={paper} onChange={e=>setPaper(e.target.value as 'a4'|'a7')}><option value="a4">A4</option><option value="a7">A7</option></select></label><label className="field"><span className="field-label">{t.copies}</span><input aria-label={t.copies} className="field-input" type="number" min={1} max={50} value={copies} onChange={e=>changeCopies(Number(e.target.value))}/></label>{paper==='a4' && <Button variant="outline" onClick={()=>{setSlots(arrangeSlots(Math.min(copies,8)));setSelectedSlot(0);}}><LayoutTemplate/>{pt.arrange}</Button>}{products.length>0 && <select className="field-input print-add" aria-label={pt.addProduct} value="" onChange={e=>addProductSlot(e.target.value)}><option value="" disabled>{pt.addProduct}</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}</div>{paper==='a4'?<><div className="a4-preview"><div className="a4-preview-frame"><PrintSheet document={document} documents={slotDocuments} language={language} slots={slots} selected={selectedSlot} onSelect={setSelectedSlot} onMove={(index,slot)=>setSlots(ss=>ss.map((s,i)=>i===index?slot:s))}/></div></div><div className="print-position"><select className="field-input" aria-label={pt.position} value={selectedSlot} onChange={e=>setSelectedSlot(Number(e.target.value))}>{slots.map((_,i)=><option key={i} value={i}>{pt.position} {i+1}</option>)}</select>{(['x','y'] as const).map(axis=><label key={axis}>{axis.toUpperCase()} mm<input className="field-input" aria-label={`A4 ${axis.toUpperCase()}`} type="number" min={0} step={.1} max={axis==='x'?210-slotSize(activeSlot).width:297-slotSize(activeSlot).height} value={activeSlot[axis]} onChange={e=>patchSlot({[axis]:Number(e.target.value)})}/></label>)}<IconButton label={pt.rotate} onClick={()=>patchSlot({rotated:!activeSlot.rotated})}><RotateCcw/></IconButton><select className="field-input print-slot-product" aria-label={pt.slotProduct} value={activeSlot.productId ?? ''} onChange={e=>assignSlotProduct(e.target.value)}><option value="">{pt.current}</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><IconButton label={pt.removeSlot} onClick={removeSlot} disabled={slots.length<=1}><Trash2/></IconButton></div>{slots.length>4 && <p className="text-xs text-muted-foreground">{pt.edge}</p>}{slotsOverlap(slots) && <p className="text-xs text-destructive">{pt.overlap}</p>}<div className="text-xs text-muted-foreground">{pt.sheet}: {Math.ceil(copies/8)}</div></>:<div className="print-preview"><div className="h-[398px] w-[280px]"><div className="origin-top-left scale-[.8]"><LabelCanvas document={document} language={language} printing/></div></div></div>}<Button onClick={doPrint} disabled={paper==='a4' && slotsOverlap(slots)}><Printer/>{t.print}</Button></DialogContent></Dialog>
    {hydrated && createPortal(<div className={`print-only print-${paper}`}><style>{`@media print { @page { size:${paper==='a4'?'210mm 297mm':'74mm 105mm'}; margin:0; } }`}</style>{paper==='a4'?Array.from({length:Math.ceil(copies/8)},(_,page)=><div className="print-page" key={page}><PrintSheet document={document} documents={slotDocuments.slice(0,Math.min(8,copies-page*8))} language={language} slots={slots.slice(0,Math.min(8,copies-page*8))}/></div>):Array.from({length:copies},(_,i)=><div className="print-page" key={i}><LabelCanvas document={document} language={language} printing/></div>)}</div>,window.document.body)}
  </AppShell>;
}