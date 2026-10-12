import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Language } from '@/components/label-editor/model';
import type { Permission } from '@/lib/permissions';

export type Profile = { user_id: string; username: string; display_name: string; is_admin: boolean; active: boolean; permissions: string[] };
type Session = {
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  profileError: boolean;
  language: Language;
  setLanguage: (language: Language) => void;
  can: (permission: Permission) => boolean;
  signIn: (username: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@s3r.local`;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileState, setProfileState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [language, setLanguageState] = useState<Language>('ar');

  useEffect(() => {
    if (localStorage.getItem('wasm-language') === 'ckb') setLanguageState('ckb');
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem('wasm-language', language);
  }, [language]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) { setProfile(null); setProfileState('idle'); return; }
    let cancelled = false;
    setProfileState('loading');
    supabase.from('profiles').select('user_id,username,display_name,is_admin,active,permissions').eq('user_id', userId).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) { setProfile(null); setProfileState('error'); return; }
      if (!data.active) {
        toast.error(language === 'ar' ? 'هذا الحساب معطّل' : 'ئەم هەژمارە ناچالاککراوە');
        void supabase.auth.signOut();
        return;
      }
      setProfile(data);
      setProfileState('idle');
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const can = useCallback((permission: Permission) => !!profile?.active && (profile.is_admin || profile.permissions.includes(permission)), [profile]);
  const signIn = useCallback(async (username: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
    return !error;
  }, []);
  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);

  const value = useMemo<Session>(() => ({
    ready: authReady && (!user || profileState === 'error' || (profileState === 'idle' && profile !== null)),
    user, profile, profileError: profileState === 'error',
    language, setLanguage: setLanguageState, can, signIn, signOut,
  }), [authReady, profileState, user, profile, language, can, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
