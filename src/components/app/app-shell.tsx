import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Boxes, Languages, LayoutTemplate, LoaderCircle, LogOut, MousePointer2, Package, ReceiptText, ScanBarcode, ShieldAlert, Tag, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { words, type Language } from '@/components/label-editor/model';
import type { Permission } from '@/lib/permissions';
import { useSession } from './session';
import { ui } from './i18n';

export type AppPage = 'editor' | 'products' | 'templates' | 'inventory' | 'orders' | 'scan' | 'users';

const pages: { key: AppPage; to: '/' | '/products' | '/templates' | '/inventory' | '/orders' | '/scan' | '/users'; icon: typeof Tag; access: Permission[] | 'admin' }[] = [
  { key: 'editor', to: '/', icon: MousePointer2, access: ['labels.design'] },
  { key: 'products', to: '/products', icon: Package, access: ['labels.design', 'labels.print'] },
  { key: 'templates', to: '/templates', icon: LayoutTemplate, access: ['labels.design'] },
  { key: 'inventory', to: '/inventory', icon: Boxes, access: ['inventory.view'] },
  { key: 'orders', to: '/orders', icon: ReceiptText, access: ['orders.view', 'orders.create'] },
  { key: 'scan', to: '/scan', icon: ScanBarcode, access: ['inventory.view', 'labels.print'] },
  { key: 'users', to: '/users', icon: Users, access: 'admin' },
];

function LanguageSelect() {
  const { language, setLanguage } = useSession();
  return <><Languages size={16} className="text-muted-foreground"/><select aria-label="اللغة / زمان" className="language-select" value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="ar">العربية</option><option value="ckb">کوردی</option></select></>;
}

function Brand() {
  const { language } = useSession();
  const t = words[language];
  return <Link to="/" className="brand"><div className="brand-icon"><Tag size={23}/></div><div><div className="brand-name">{t.brand}<span className="text-primary">.</span></div><div className="brand-subtitle">{t.subtitle}</div></div></Link>;
}

function LoginScreen() {
  const { language, signIn } = useSession();
  const u = ui[language];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    const ok = await signIn(username, password);
    setBusy(false);
    if (!ok) toast.error(u.loginFailed); else setPassword('');
  }
  return <div dir="rtl" className="login-screen">
    <div className="login-lang"><LanguageSelect/></div>
    <form onSubmit={submit} className="login-card">
      <div className="login-brand"><div className="brand-icon"><Tag size={23}/></div><div className="brand-name">{words[language].brand}<span className="text-primary">.</span></div></div>
      <h1>{u.loginTitle}</h1><p>{u.loginHint}</p>
      <label className="field"><span className="field-label">{u.username}</span><input className="field-input" dir="ltr" autoFocus autoComplete="username" required pattern="[A-Za-z0-9_.\-]+" maxLength={60} value={username} onChange={e=>setUsername(e.target.value)}/></label>
      <label className="field"><span className="field-label">{u.password}</span><input className="field-input" dir="ltr" type="password" autoComplete="current-password" required minLength={6} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <Button type="submit" disabled={busy} className="w-full">{busy && <LoaderCircle className="animate-spin"/>}{u.login}</Button>
    </form>
  </div>;
}

function CenterMessage({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children?: ReactNode }) {
  return <div className="empty-library">{icon}<h2>{title}</h2>{hint && <p>{hint}</p>}{children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}</div>;
}

export function AppShell({ active, children }: { active: AppPage; children: ReactNode }) {
  const { ready, user, profile, profileError, language, can, signOut } = useSession();
  const t = words[language];
  const u = ui[language];
  // Live order notifications: anyone who can view orders is alerted when a new order arrives.
  const canViewOrders = profile ? can('orders.view') : false;
  const uid = user?.id;
  useEffect(() => {
    if (!canViewOrders) return;
    const channel = supabase.channel('orders-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        const row = payload.new as { user_id?: string; customer_name?: string; total?: number };
        if (row.user_id === uid) return;
        toast.info(u.newOrderToast, { description: `${row.customer_name || '—'} · ${u.orderTotal}: ${Number(row.total ?? 0)}` });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewOrders, uid, language]);

  if (!ready) return <div className="grid min-h-screen place-items-center text-muted-foreground"><LoaderCircle className="animate-spin"/></div>;
  if (!user) return <LoginScreen/>;
  if (profileError || !profile) return <div dir="rtl" className="min-h-screen"><CenterMessage icon={<ShieldAlert/>} title={u.setupNeeded} hint={u.setupHint}><Button onClick={()=>window.location.reload()}>{u.retry}</Button><Button variant="outline" onClick={signOut}>{u.logout}</Button></CenterMessage></div>;

  const allowed = (access: Permission[] | 'admin') => access === 'admin' ? profile.is_admin : access.some(can);
  const visible = pages.filter(p => allowed(p.access));
  const label = (key: AppPage) => ({ editor: t.editor, products: t.products, templates: t.templates, inventory: u.inventory, orders: u.orders, scan: u.scan, users: u.users })[key];
  const page = pages.find(p => p.key === active)!;
  const name = profile.display_name || profile.username;

  return <div dir="rtl" className={`min-h-screen ${visible.length > 1 ? 'has-mobile-nav' : ''}`}>
    <header className="app-header">
      <Brand/>
      <nav className="header-nav" aria-label="Navigation">{visible.map(p => <Link key={p.key} to={p.to} className={active === p.key ? 'active' : ''}><p.icon size={16}/><span>{label(p.key)}</span></Link>)}</nav>
      <div className="header-actions">
        <LanguageSelect/><span className="h-5 w-px bg-border"/>
        <div className="user-chip" title={profile.username}><div className="avatar">{name.slice(0, 1).toUpperCase()}</div><div className="user-chip-text"><b>{name}</b><span>{profile.is_admin ? u.admin : `@${profile.username}`}</span></div></div>
        <Button variant="ghost" size="icon" title={u.logout} aria-label={u.logout} onClick={signOut}><LogOut/></Button>
      </div>
    </header>
    {visible.length > 1 && <nav className="mobile-nav" aria-label="Navigation">{visible.map(p => <Link key={p.key} to={p.to} className={active === p.key ? 'active' : ''}><p.icon size={20}/><span>{label(p.key)}</span></Link>)}</nav>}
    {allowed(page.access) ? children : <CenterMessage icon={<ShieldAlert/>} title={u.noAccess} hint={visible.length ? u.noAccessHint : u.noPages}>{visible.map(p => <Button key={p.key} variant="outline" asChild><Link to={p.to}><p.icon/>{label(p.key)}</Link></Button>)}</CenterMessage>}
  </div>;
}
