import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from '@tanstack/react-router';
import { AlignCenter, AlignLeft, AlignRight, ArrowDownToLine, ArrowLeft, ArrowRight, Barcode as BarcodeIcon, Bold, Check, CheckCheck, ChevronDown, CircleHelp, Copy, Eye, EyeOff, FileText, GripVertical, ImagePlus, Languages, Layers, LayoutTemplate, LoaderCircle, Maximize, Minus, MousePointer2, Package, Plus, Printer, Redo2, RotateCcw, Save, Settings2, ShieldCheck, Sparkles, Tag, Trash2, Type, Undo2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import type { User } from '@supabase/supabase-js';
import type { Json } from '@/integrations/supabase/types';
import headphones from '@/assets/headphones.jpg';
import { defaultElements, productSchema, sampleProduct, words, type DocumentState, type ElementKind, type LabelElement, type Language, type Product } from './model';
import { LabelCanvas } from './label-canvas';

type SavedProduct = { id:string; name:string; data:Json; layout:Json; theme:string; updated_at:string };
const initialDocument: DocumentState = { product:sampleProduct, elements:defaultElements, theme:'mint' };
const layerIcons: Record<ElementKind, typeof Type> = {store:Tag,name:Type,model:Type,photo:ImagePlus,details:FileText,specs:FileText,warranty:ShieldCheck,barcode:BarcodeIcon,footer:Type,text:Type,line:Minus};

function IconButton({ label, children, onClick, disabled=false, active=false, className='' }: { label:string; children:ReactNode; onClick?:()=>void; disabled?:boolean; active?:boolean; className?:string }) {
  return <Button variant="ghost" size="icon" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`tool-icon ${active?'selected':''} ${className}`}>{children}</Button>;
}

export function LabelEditor({ view='editor' }: { view?:'editor'|'products'|'templates' }) {
  const navigate = useNavigate();
  const [language,setLanguage]=useState<Language>('ar');
  const t=words[language];
  const [document,setDocument]=useState<DocumentState>(initialDocument);
  const [selected,setSelected]=useState('name');
  const [panelTab,setPanelTab]=useState<'data'|'design'>('data');
  const [zoom,setZoom]=useState(90);
  const [history,setHistory]=useState<DocumentState[]>([]);
  const [future,setFuture]=useState<DocumentState[]>([]);
  const [dirty,setDirty]=useState(false);
  const [user,setUser]=useState<User|null>(null);
  const [authOpen,setAuthOpen]=useState(false);
  const [signup,setSignup]=useState(false);
  const [busy,setBusy]=useState(false);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [products,setProducts]=useState<SavedProduct[]>([]);
  const [productId,setProductId]=useState<string|null>(null);
  const [search,setSearch]=useState('');
  const [printOpen,setPrintOpen]=useState(false);
  const [copies,setCopies]=useState(1);
  const [hydrated,setHydrated]=useState(false);
  const [template,setTemplate]=useState('classic');
  const fileRef=useRef<HTMLInputElement>(null);
  const dragStart=useRef<DocumentState|null>(null);
  const docRef=useRef(document); docRef.current=document;
  const current=document.elements.find(el=>el.id===selected);

  useEffect(()=>{
    setHydrated(true);
    const lang=localStorage.getItem('wasm-language');if(lang==='ckb')setLanguage('ckb');
    try { const draft=JSON.parse(sessionStorage.getItem('wasm-draft') || 'null'); if(draft && productSchema.safeParse(draft.product).success && Array.isArray(draft.elements)) {setDocument(draft);setProductId(sessionStorage.getItem('wasm-product-id'));} } catch { /* Ignore invalid drafts. */ }
    supabase.auth.getUser().then(({data})=>setUser(data.user));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user ?? null));
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{ if(hydrated) {sessionStorage.setItem('wasm-draft',JSON.stringify(document)); if(productId)sessionStorage.setItem('wasm-product-id',productId);else sessionStorage.removeItem('wasm-product-id');} },[document,hydrated,productId]);
  useEffect(()=>{
    if(!user){setProducts([]);return;}
    supabase.from('label_products').select('id,name,data,layout,theme,updated_at').order('updated_at',{ascending:false}).then(({data,error})=>{if(error)toast.error(t.failure);else setProducts(data || []);});
  },[user,view,t.failure]);
  useEffect(()=>{ if(hydrated){window.document.documentElement.lang=language;localStorage.setItem('wasm-language',language);} },[language,hydrated]);
  function update(next:DocumentState,record=true) {
    if(record){setHistory(h=>[...h.slice(-39),docRef.current]);setFuture([]);}
    setDocument(next);setDirty(true);
  }
  function setField(key:keyof Product,value:string){update({...document,product:{...document.product,[key]:value}});}
  function patchElement(patch:Partial<LabelElement>){update({...document,elements:document.elements.map(el=>el.id===selected?{...el,...patch}:el)});}
  function move(id:string,x:number,y:number,commit:boolean){
    if(!dragStart.current)dragStart.current=docRef.current;
    setDocument(d=>({...d,elements:d.elements.map(el=>el.id===id?{...el,x,y}:el)}));setDirty(true);
    if(commit){const start=dragStart.current;if(start)setHistory(h=>[...h.slice(-39),start]);setFuture([]);dragStart.current=null;}
  }
  function undo(){const previous=history.at(-1);if(!previous)return;setFuture(f=>[document,...f]);setDocument(previous);setHistory(h=>h.slice(0,-1));setDirty(true);}
  function redo(){const next=future[0];if(!next)return;setHistory(h=>[...h,document]);setDocument(next);setFuture(f=>f.slice(1));setDirty(true);}
  function addElement(kind:ElementKind){const id=crypto.randomUUID();update({...document,elements:[...document.elements,{id,kind,x:30,y:190,width:kind==='photo'?150:290,height:kind==='photo'?130:kind==='barcode'?50:36,visible:true,text:t.customText}]});setSelected(id);}
  function newProduct(){update({product:{...sampleProduct,name:'',model:'',color:'',size:'',specs:'',warranty:'',barcode:'',store:document.product.store,image:''},elements:defaultElements,theme:'mint'});setProductId(null);setSelected('name');navigate({to:'/'});}
  function openProduct(p:SavedProduct){const result=productSchema.safeParse(p.data);if(!result.success || !Array.isArray(p.layout)){toast.error(t.failure);return;}setDocument({product:result.data,elements:p.layout as unknown as LabelElement[],theme:p.theme});setProductId(p.id);setHistory([]);setFuture([]);setDirty(false);navigate({to:'/'});}
  async function save(){
    if(!productSchema.safeParse(document.product).success){toast.error(t.invalid);return;}
    if(!user){setAuthOpen(true);return;}
    setBusy(true);
    const payload={user_id:user.id,name:document.product.name,data:document.product as unknown as Json,layout:document.elements as unknown as Json,theme:document.theme,updated_at:new Date().toISOString()};
    const {data,error}=productId ? await supabase.from('label_products').update(payload).eq('id',productId).select().single() : await supabase.from('label_products').insert(payload).select().single();
    setBusy(false);if(error){toast.error(t.failure);return;}setProductId(data.id);setDirty(false);toast.success(t.savedToast);
  }
  async function auth(e:React.FormEvent){e.preventDefault();setBusy(true);const {error,data}=signup?await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}}):await supabase.auth.signInWithPassword({email,password});setBusy(false);if(error){toast.error(error.message);return;}if(signup && !data.session){toast.success(language==='ar'?'تحقق من بريدك لتأكيد الحساب':'ئیمەیڵەکەت بپشکنە بۆ پشتڕاستکردنەوە');return;}setAuthOpen(false);toast.success(t.login);}
  async function removeProduct(id:string){if(!window.confirm(language==='ar'?'هل تريد حذف هذا المنتج؟':'ئایا ئەم بەرهەمە دەسڕیتەوە؟'))return;const {error}=await supabase.from('label_products').delete().eq('id',id);if(error)toast.error(t.failure);else setProducts(p=>p.filter(x=>x.id!==id));}
  function applyTemplate(key:string){setTemplate(key);update({...document,elements:defaultElements.map(el=>key==='compact'?{...el,visible:el.kind!=='photo',y:el.kind==='details'?150:el.kind==='specs'?205:el.kind==='warranty'?280:el.kind==='barcode'?335:el.y}:el)});}
  async function upload(file:File|undefined){if(!file)return;if(file.size>2000000 || !['image/png','image/jpeg','image/webp'].includes(file.type)){toast.error(language==='ar'?'اختر صورة JPG أو PNG أو WebP أصغر من 2MB':'وێنەی JPG، PNG یان WebP کەمتر لە 2MB هەڵبژێرە');return;}const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==='string')setField('image',reader.result);};reader.readAsDataURL(file);}
  function doPrint(){if(!productSchema.safeParse(document.product).success){toast.error(t.invalid);return;}setSelected('');window.print();}
  const field=(key:keyof Product,label:string,ltr=false,required=false)=><label className="field"><span className="field-label">{label}{required&&<span className="required">*</span>}</span><input aria-label={label} maxLength={key==='barcode'?40:120} className="field-input" dir={ltr?'ltr':'rtl'} value={document.product[key]} onChange={e=>setField(key,e.target.value)} placeholder={label}/></label>;
  const layerName=(kind:ElementKind)=>({store:t.store,name:t.name,model:t.model,photo:t.photo,details:`${t.color} / ${t.size}`,specs:t.specs,warranty:t.warranty,barcode:t.barcode,footer:t.text,text:t.text,line:t.line})[kind];
  const templatePicker=<div className="template-grid">{[['classic',t.standard],['compact',t.compact]].map(([key,label])=><Button key={key} variant="ghost" className={`template-choice ${template===key?'active':''}`} onClick={()=>applyTemplate(key)}><span className="template-mini"><i/><i/><b/><i/><i/></span>{label}</Button>)}</div>;

  return <div dir="rtl" className="min-h-screen">
    <header className="app-header">
      <Link to="/" className="brand"><div className="brand-icon"><Tag size={23}/></div><div><div className="brand-name">{t.brand}<span className="text-primary">.</span></div><div className="brand-subtitle">{t.subtitle}</div></div></Link>
      <nav className="header-nav" aria-label="Navigation"><Link to="/" className={view==='editor'?'active':''}><MousePointer2 size={16}/><span>{t.editor}</span></Link><Link to="/products" className={view==='products'?'active':''}><Package size={16}/><span>{t.products}</span></Link><Link to="/templates" className={view==='templates'?'active':''}><LayoutTemplate size={16}/><span>{t.templates}</span></Link></nav>
      <div className="header-actions"><Languages size={16} className="text-muted-foreground"/><select aria-label="اللغة / زمان" className="language-select" value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="ar">العربية</option><option value="ckb">کوردی</option></select><span className="h-5 w-px bg-border"/><Button variant="ghost" size="icon" title={user?t.logout:t.login} aria-label={user?t.logout:t.login} onClick={()=>user?supabase.auth.signOut():setAuthOpen(true)}><div className="avatar">{user?user.email?.slice(0,1).toUpperCase():'و'}</div></Button></div>
    </header>
    {view==='products'?<main className="library"><div className="library-top"><h1>{t.library}</h1><Button onClick={newProduct}><Plus/>{t.newProduct}</Button></div><input className="field-input mb-6 max-w-sm" value={search} onChange={e=>setSearch(e.target.value)} aria-label={t.search} placeholder={t.search}/>{!user?<div className="empty-library"><Package/><h2>{t.authRequired}</h2><Button onClick={()=>setAuthOpen(true)}>{t.login}<ArrowLeft/></Button></div>:products.length===0?<div className="empty-library"><Package/><h2>{t.empty}</h2><p>{t.emptyText}</p><Button className="mt-5" onClick={()=>navigate({to:'/'})}>{t.newProduct}<Plus/></Button></div>:<div className="library-grid">{products.filter(p=>p.name.includes(search)).map(p=><article key={p.id} className="product-card">{(p.data as unknown as Product).image?<img src={(p.data as unknown as Product).image} alt={p.name}/>:p.name==='سماعات لاسلكية'?<img src={headphones} alt={p.name}/>:<div className="flex h-36 items-center justify-center bg-muted"><Tag className="size-10 text-primary"/></div>}<div className="product-card-content"><h2>{p.name}</h2><p dir="ltr">{(p.data as unknown as Product).model}</p><div className="mt-4 flex items-center gap-2"><Button variant="outline" onClick={()=>openProduct(p)}>{t.edit}<ArrowLeft/></Button><IconButton label={t.print} onClick={()=>{openProduct(p);setPrintOpen(true);}}><Printer/></IconButton><IconButton label={t.delete} onClick={()=>removeProduct(p.id)}><Trash2/></IconButton></div></div></article>)}</div>}</main>:<>
    <section className="editor-heading"><div><h1>{view==='templates'?t.templates:t.heading}</h1><p>{t.description}</p></div><div className="heading-actions"><span className="saved-indicator"><CheckCheck size={14}/>{dirty?t.unsaved:t.saved}</span><Button variant="outline" onClick={save} disabled={busy}>{busy?<LoaderCircle className="animate-spin"/>:<Save/>}{t.save}</Button><Button onClick={()=>setPrintOpen(true)}><Printer/>{t.print}</Button></div></section>
    <main className="editor-shell">
      <aside className="panel product-panel"><div className="panel-tabs"><Button variant="ghost" className={`panel-tab ${panelTab==='data' && view!=='templates'?'active':''}`} onClick={()=>setPanelTab('data')}>{t.data}</Button><Button variant="ghost" className={`panel-tab ${panelTab==='design' || view==='templates'?'active':''}`} onClick={()=>setPanelTab('design')}>{t.design}</Button></div><div className="panel-inner">{panelTab==='data' && view!=='templates'?<><div className="panel-title">{t.info}<IconButton label={t.newProduct} onClick={newProduct}><Plus/></IconButton></div>{field('name',t.name,false,true)}{field('model',t.model,true)}<div className="field-row">{field('color',t.color)}{field('size',t.size)}</div><label className="field"><span className="field-label">{t.specs}</span><textarea className="field-input" aria-label={t.specs} maxLength={500} value={document.product.specs} onChange={e=>setField('specs',e.target.value)}/></label>{field('warranty',t.warranty)}{field('barcode',t.barcode,true,true)}<div className="field-help -mt-2 mb-5" dir="ltr">CODE 128</div><span className="field-label">{t.photo}</span><div className="photo-row"><img src={document.product.image || headphones} alt={t.photo} width={45} height={45}/><div><p>{t.photo}</p><span>JPG, PNG, WebP</span></div><IconButton label={t.changePhoto} onClick={()=>fileRef.current?.click()}><Upload/></IconButton></div><input type="file" hidden ref={fileRef} accept="image/png,image/jpeg,image/webp" onChange={e=>upload(e.target.files?.[0])}/></>:<><div className="panel-title">{t.templates}<LayoutTemplate size={16}/></div>{templatePicker}<div className="mt-6">{field('store',t.store)}</div><div className="section-title">{t.colors}</div><div className="swatches">{['mint','blue','rose','silver'].map(color=><Button key={color} variant="ghost" title={color} aria-label={color} className={`swatch ${color} ${document.theme===color?'active':''}`} onClick={()=>update({...document,theme:color})}/>)}</div><Button variant="outline" className="mt-6 w-full" onClick={()=>update({...document,elements:defaultElements})}><RotateCcw/>{t.reset}</Button></>}</div></aside>
      <section className="workspace"><div className="canvas-toolbar"><div className="tool-cluster"><IconButton label={language==='ar'?'تحديد':'دیاریکردن'} active><MousePointer2/></IconButton><span className="tool-divider"/><IconButton label={language==='ar'?'تراجع':'پاشگەزبوونەوە'} onClick={undo} disabled={!history.length}><Undo2/></IconButton><IconButton label={language==='ar'?'إعادة':'دووبارەکردنەوە'} onClick={redo} disabled={!future.length}><Redo2/></IconButton><span className="tool-divider"/><IconButton label="Bold" onClick={()=>current && patchElement({bold:!current.bold})} active={current?.bold} disabled={!current} className="optional-tool"><Bold/></IconButton><IconButton label="Align center" onClick={()=>patchElement({align:'center'})} disabled={!current} className="optional-tool"><AlignCenter/></IconButton><IconButton label={t.delete} disabled={!current} onClick={()=>{update({...document,elements:document.elements.filter(el=>el.id!==selected)});setSelected('');}}><Trash2/></IconButton></div><select className="paper-select" aria-label="حجم الورقة" value="A7" onChange={()=>{}}><option>A7 · 74 × 105 mm</option></select></div>
      <div className="canvas-stage"><div className="paper-frame" style={{width:350*zoom/100,height:497*zoom/100} as CSSProperties}><div className="paper-size-top">74 mm</div><div className="paper-size-side">105 mm</div><div style={{transform:`scale(${zoom/100})`,transformOrigin:'top left'}}><LabelCanvas document={document} language={language} selected={selected} onSelect={setSelected} onMove={move}/></div></div></div>
      <div className="canvas-footer"><span>A7 <span className="mx-2">·</span> 74 × 105 mm <span className="mx-2">·</span> {t.portrait}</span><div className="zoom-control"><IconButton label="Zoom out" onClick={()=>setZoom(z=>Math.max(50,z-10))}><Minus/></IconButton><span>{zoom}%</span><IconButton label="Zoom in" onClick={()=>setZoom(z=>Math.min(130,z+10))}><Plus/></IconButton><span className="tool-divider"/><IconButton label="Fit" onClick={()=>setZoom(90)}><Maximize/></IconButton></div></div></section>
      <aside className="panel inspector"><div className="inspector-heading"><Settings2 size={15}/>{t.elements}</div><section className="inspector-section"><h2 className="section-title">{t.add}<Plus size={13}/></h2><div className="element-grid">{([['text',Type,t.text],['photo',ImagePlus,t.image],['barcode',BarcodeIcon,t.barcode],['line',Minus,t.line],['warranty',ShieldCheck,t.warranty],['specs',FileText,t.specs]] as const).map(([kind,Icon,label])=><Button key={kind} variant="ghost" className="add-element" onClick={()=>addElement(kind)} draggable onDragStart={e=>e.dataTransfer.setData('label-element',kind)}><Icon/>{label}</Button>)}</div></section>
      <section className="inspector-section"><h2 className="section-title">{t.layers}<Layers size={14}/></h2><div className="layer-list">{document.elements.filter(el=>el.kind!=='footer').map(el=>{const Icon=layerIcons[el.kind];return <div className={`layer-row ${selected===el.id?'active':''}`} key={el.id}><GripVertical className="text-muted-foreground"/><Icon/><Button variant="ghost" className="layer-name h-7 justify-start p-0 text-[10px]" onClick={()=>setSelected(el.id)}>{layerName(el.kind)}</Button><Button variant="ghost" size="icon" className="layer-toggle" aria-label={`${el.visible?t.hide:t.show} ${layerName(el.kind)}`} onClick={()=>update({...document,elements:document.elements.map(x=>x.id===el.id?{...x,visible:!x.visible}:x)})}>{el.visible?<Eye className="text-muted-foreground"/>:<EyeOff/>}</Button></div>;})}</div></section>
      <section className="inspector-section"><h2 className="section-title">{current?t.selected:t.colors}<Sparkles size={13}/></h2>{current?<><div className="field-row"><label className="field"><span className="field-label">X</span><input type="number" aria-label="X" className="field-input" dir="ltr" value={current.x} min={0} max={350-current.width} onChange={e=>patchElement({x:Math.max(0,Math.min(350-current.width,Number(e.target.value)))})}/></label><label className="field"><span className="field-label">Y</span><input type="number" aria-label="Y" className="field-input" dir="ltr" value={current.y} min={8} max={497-current.height} onChange={e=>patchElement({y:Math.max(8,Math.min(497-current.height,Number(e.target.value)))})}/></label></div>{current.kind==='text' && <input aria-label={t.text} className="field-input mb-3" value={current.text || ''} maxLength={120} onChange={e=>patchElement({text:e.target.value})}/>}<div className="flex items-center justify-between gap-2"><label className="text-[10px]">{t.sizeFont}</label><input className="field-input w-16" type="number" aria-label={t.sizeFont} value={current.fontSize || (current.kind==='name'?23:11)} min={8} max={40} onChange={e=>patchElement({fontSize:Math.max(8,Math.min(40,Number(e.target.value)))})}/></div></>:<div className="swatches">{['mint','blue','rose','silver'].map(color=><Button key={color} variant="ghost" title={color} aria-label={color} className={`swatch ${color} ${document.theme===color?'active':''}`} onClick={()=>update({...document,theme:color})}/>)}</div>}</section></aside>
    </main><footer className="below-editor"><span><span className="status-dot"/>{t.ready}</span><span>CODE 128 <span className="mx-2">·</span> A7 / ISO 216</span></footer></>}
    <Dialog open={authOpen} onOpenChange={setAuthOpen}><DialogContent dir="rtl" className="max-w-sm"><DialogHeader><DialogTitle>{signup?t.signup:t.login}</DialogTitle><DialogDescription>{t.authRequired}</DialogDescription></DialogHeader><form onSubmit={auth} className="auth-form"><label>{t.email}<input className="field-input" type="email" dir="ltr" required value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/></label><label>{t.password}<input className="field-input" type="password" dir="ltr" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} maxLength={128}/></label><Button disabled={busy} type="submit">{busy?<LoaderCircle className="animate-spin"/>:null}{signup?t.signup:t.login}</Button><Button type="button" variant="outline" onClick={async()=>{const result=await lovable.auth.signInWithOAuth('google',{redirect_uri:window.location.origin});if(result.error)toast.error(result.error.message);else if(!result.redirected)setAuthOpen(false);}}>Google</Button><Button type="button" variant="link" onClick={()=>setSignup(s=>!s)}>{signup?t.login:t.signup}</Button></form></DialogContent></Dialog>
    <Dialog open={printOpen} onOpenChange={setPrintOpen}><DialogContent dir="rtl" className="max-w-md"><DialogHeader><DialogTitle>{t.preview}</DialogTitle><DialogDescription>A7 · 74 × 105 mm · CODE 128</DialogDescription></DialogHeader><div className="print-preview"><div className="h-[398px] w-[280px]"><div className="origin-top-left scale-[.8]"><LabelCanvas document={document} language={language} printing/></div></div></div><div className="print-summary"><label className="flex items-center gap-3">{t.copies}<input aria-label={t.copies} className="field-input w-20" type="number" min={1} max={50} value={copies} onChange={e=>setCopies(Math.max(1,Math.min(50,Number(e.target.value))))}/></label><span>{t.portrait}</span></div><Button onClick={doPrint}><Printer/>{t.print}</Button></DialogContent></Dialog>
    {hydrated && createPortal(<div className="print-only">{Array.from({length:copies},(_,i)=><div className="print-page" key={i}><LabelCanvas document={document} language={language} printing/></div>)}</div>,window.document.body)}
  </div>;
}