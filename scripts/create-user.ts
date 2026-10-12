import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const isAdmin = args.includes('--admin');
const [username, password] = args.filter(a => a !== '--admin');
if (!username || !password || !/^[A-Za-z0-9_.-]{2,60}$/.test(username) || password.length < 6) {
  console.error('Usage: bun scripts/create-user.ts <username> <password> [--admin]  (password >= 6 chars)');
  process.exit(1);
}

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const name = username.toLowerCase();
const { data, error } = await admin.auth.admin.createUser({ email: `${name}@s3r.local`, password, email_confirm: true, user_metadata: { username: name } });
if (error) {
  console.error(`Failed: ${error.message}`);
  process.exit(1);
}
const profile = await admin.from('profiles').upsert({ user_id: data.user.id, username: name, is_admin: isAdmin }, { onConflict: 'user_id' });
if (profile.error) console.warn(`Profile not saved (run supabase/setup.sql first): ${profile.error.message}`);
console.log(`User "${name}" created${isAdmin ? ' as administrator' : ''}.`);
