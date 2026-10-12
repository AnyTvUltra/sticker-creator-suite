import { useEffect, useState, type FormEvent } from 'react';
import { Check, Crown, KeyRound, LoaderCircle, Pencil, Plus, ShieldCheck, Trash2, UserX, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { PERMISSIONS, permissionGroups, permissionPresets, permissionText, type Permission } from '@/lib/permissions';
import { AppShell } from '@/components/app/app-shell';
import { useSession } from '@/components/app/session';
import { rpcError, ui } from '@/components/app/i18n';
import type { Language } from '@/components/label-editor/model';

type Account = Database['public']['Functions']['admin_list_users']['Returns'][number];
type T = (typeof ui)['ar'];
type Draft = { id: string | null; username: string; displayName: string; password: string; isAdmin: boolean; active: boolean; permissions: Permission[] };

const fmtDate = (d: string | null, t: T) => d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : t.never;

export function UsersPage() {
  const { language, profile } = useSession();
  const t = ui[language];
  const p = permissionText[language];
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  async function load() {
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) { toast.error(rpcError(error.message, t)); setAccounts([]); return; }
    setAccounts(data ?? []);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  async function remove(a: Account) {
    if (!window.confirm(`${t.confirmDeleteUser}\n@${a.username}`)) return;
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: a.user_id });
    if (error) { toast.error(rpcError(error.message, t)); return; }
    toast.success(t.deleted);
    setAccounts(list => list?.filter(x => x.user_id !== a.user_id) ?? null);
  }

  const edit = (a: Account) => setDraft({ id: a.user_id, username: a.username, displayName: a.display_name, password: '', isAdmin: a.is_admin, active: a.active, permissions: a.permissions.filter((x): x is Permission => (PERMISSIONS as readonly string[]).includes(x)) });

  return <AppShell active="users">
    <main className="library">
      <div className="library-top">
        <div><h1>{t.usersTitle}</h1><p className="inv-subtitle">{t.usersSubtitle}</p></div>
        <Button onClick={() => setDraft({ id: null, username: '', displayName: '', password: '', isAdmin: false, active: true, permissions: [] })}><Plus/>{t.newUser}</Button>
      </div>
      {accounts === null ? <div className="grid place-items-center py-24 text-muted-foreground"><LoaderCircle className="animate-spin"/></div>
        : accounts.length === 0 ? <div className="empty-library"><Users/><h2>{t.usersTitle}</h2></div>
        : <div className="users-grid">{accounts.map(a => {
          const name = a.display_name || a.username;
          const self = a.user_id === profile?.user_id;
          return <article key={a.user_id} className={`user-card ${a.active ? '' : 'is-disabled'}`}>
            <div className="user-card-top">
              <div className={`user-avatar ${a.is_admin ? 'admin' : ''}`}>{name.slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1"><h3>{name}{self && <span className="user-you">{t.you}</span>}</h3><p dir="ltr" className="text-right">@{a.username}</p></div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label={t.edit} title={t.edit} onClick={() => edit(a)}><Pencil/></Button>
                {!self && <Button variant="ghost" size="icon" className="inv-delete" aria-label={t.delete} title={t.delete} onClick={() => remove(a)}><Trash2/></Button>}
              </div>
            </div>
            <div className="user-badges">
              {a.is_admin && <span className="user-badge admin"><Crown size={12}/>{t.admin}</span>}
              {!a.active && <span className="user-badge off"><UserX size={12}/>{t.disabled}</span>}
              {!a.is_admin && <span className="user-badge"><ShieldCheck size={12}/>{a.permissions.length} {t.permCount}</span>}
            </div>
            <div className="user-perms">{a.is_admin ? <span className="user-perm all">{t.allPerms}</span> : a.permissions.map(x => <span key={x} className="user-perm">{p.items[x as Permission]?.title ?? x}</span>)}</div>
            <p className="user-last">{t.lastLogin}: <span dir="ltr">{fmtDate(a.last_sign_in_at, t)}</span></p>
          </article>;
        })}</div>}
    </main>
    {draft && <UserDialog key={draft.id ?? 'new'} initial={draft} self={draft.id === profile?.user_id} language={language} onClose={() => setDraft(null)} onSaved={() => { setDraft(null); void load(); }}/>}
  </AppShell>;
}

function UserDialog({ initial, self, language, onClose, onSaved }: { initial: Draft; self: boolean; language: Language; onClose: () => void; onSaved: () => void }) {
  const t = ui[language];
  const p = permissionText[language];
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const isNew = !initial.id;
  const has = (x: Permission) => d.isAdmin || d.permissions.includes(x);
  const toggle = (x: Permission, on: boolean) => setD(s => ({ ...s, permissions: on ? [...new Set([...s.permissions, x])] : s.permissions.filter(y => y !== x) }));
  const setGroup = (items: Permission[], on: boolean) => setD(s => ({ ...s, permissions: on ? [...new Set([...s.permissions, ...items])] : s.permissions.filter(y => !items.includes(y)) }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    let error;
    if (isNew) {
      ({ error } = await supabase.rpc('admin_create_user', { p_username: d.username, p_password: d.password, p_display_name: d.displayName, p_is_admin: d.isAdmin, p_permissions: d.permissions }));
    } else {
      ({ error } = await supabase.rpc('admin_update_user', { p_user_id: d.id!, p_display_name: d.displayName, p_is_admin: d.isAdmin, p_active: d.active, p_permissions: d.permissions }));
      if (!error && d.password) ({ error } = await supabase.rpc('admin_set_password', { p_user_id: d.id!, p_password: d.password }));
    }
    setBusy(false);
    if (error) { toast.error(rpcError(error.message, t)); return; }
    toast.success(isNew ? t.created : t.saved);
    onSaved();
  }

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent dir="rtl" className="inv-dialog">
      <DialogHeader><DialogTitle>{isNew ? t.newUser : t.editUser}</DialogTitle><DialogDescription>{t.usersSubtitle}</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="user-form">
        <div className="inv-form-grid">
          <label className="field"><span className="field-label">{t.username}{isNew && <span className="required">*</span>}</span><input className="field-input" dir="ltr" required={isNew} disabled={!isNew} pattern="[A-Za-z0-9_.\-]{2,60}" maxLength={60} autoComplete="off" value={d.username} onChange={e => setD(s => ({ ...s, username: e.target.value }))}/></label>
          <label className="field"><span className="field-label">{t.displayName}</span><input className="field-input" maxLength={80} value={d.displayName} onChange={e => setD(s => ({ ...s, displayName: e.target.value }))}/></label>
          <label className="field inv-span-2"><span className="field-label"><KeyRound size={12}/>{isNew ? t.password : t.newPassword}{isNew && <span className="required">*</span>}</span><input className="field-input" dir="ltr" type="text" required={isNew} minLength={6} maxLength={128} autoComplete="new-password" value={d.password} onChange={e => setD(s => ({ ...s, password: e.target.value }))}/></label>
        </div>

        <div className="user-switches">
          <label className="user-switch"><Switch checked={d.isAdmin} disabled={self} onCheckedChange={v => setD(s => ({ ...s, isAdmin: v }))}/><span><Crown size={14}/>{t.isAdmin}</span></label>
          {!isNew && <label className="user-switch"><Switch checked={d.active} disabled={self} onCheckedChange={v => setD(s => ({ ...s, active: v }))}/><span>{t.active}</span></label>}
        </div>

        <section className={`perm-panel ${d.isAdmin ? 'is-admin' : ''}`}>
          <div className="perm-panel-head">
            <h4><ShieldCheck size={15}/>{t.permissions}</h4>
            <div className="perm-presets"><span>{t.presets}:</span>{permissionPresets.map(preset => <button key={preset.key} type="button" disabled={d.isAdmin} className="inv-chip" onClick={() => setD(s => ({ ...s, permissions: [...preset.items] }))}>{p.presets[preset.key]}</button>)}</div>
          </div>
          {permissionGroups.map(group => {
            const all = group.items.every(has);
            return <div key={group.key} className="perm-group">
              <div className="perm-group-head"><b>{p.groups[group.key]}</b><button type="button" disabled={d.isAdmin} onClick={() => setGroup(group.items, !all)}>{all ? t.clearAll : t.selectAll}</button></div>
              <div className="perm-items">{group.items.map(x => <label key={x} className={`perm-item ${has(x) ? 'on' : ''}`}>
                <Checkbox checked={has(x)} disabled={d.isAdmin} onCheckedChange={v => toggle(x, v === true)}/>
                <div><b>{p.items[x].title}</b><span>{p.items[x].hint}</span></div>
                {has(x) && <Check size={14} className="perm-check"/>}
              </label>)}</div>
            </div>;
          })}
        </section>

        <div className="inv-form-actions"><Button type="button" variant="outline" onClick={onClose}>{t.cancel}</Button><Button type="submit" disabled={busy}>{busy && <LoaderCircle className="animate-spin"/>}{isNew ? t.newUser : t.save}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
