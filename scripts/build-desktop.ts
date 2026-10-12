import { $ } from 'bun';
import { copyFileSync, cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const desktop = join(root, 'desktop');

await $`bun run build`.cwd(root).env({ ...process.env, NITRO_PRESET: 'node-server' });

rmSync(join(desktop, 'server'), { recursive: true, force: true });
cpSync(join(root, '.output'), join(desktop, 'server'), { recursive: true });

// Only public values; the service role key must never ship inside the app.
writeFileSync(join(desktop, 'env.json'), JSON.stringify({ SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY }, null, 2));

await $`bun install`.cwd(desktop);
if (!process.argv.includes('--no-dist')) {
  // Build outside OneDrive: its sync locks files and makes electron-builder fail with EPERM.
  const out = join(process.env.LOCALAPPDATA ?? tmpdir(), 's3r-build');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  await $`bun run dist --config.directories.output=${out}`.cwd(desktop).env(env);
  mkdirSync(join(desktop, 'release'), { recursive: true });
  for (const exe of ['S3R-Sticker-Creator-Portable.exe', 'S3R-Sticker-Creator-Setup.exe']) copyFileSync(join(out, exe), join(desktop, 'release', exe));
  console.log(`EXE files: ${join(desktop, 'release')}`);
}
