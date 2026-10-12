<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the editor, library, and template views on TanStack file routes and reuse the shared label editor so preview and print share identical document rendering.
- Store private product data and layouts in Cloud with owner-scoped RLS; sessionStorage is only a transient navigation draft, never the durable product library.
- Use a 350 × 497 logical label canvas and scale the shared renderer for exact 74 × 105 mm A7 printing; persisted element positions use this logical coordinate space.
- Bundle the Arabic font locally so the editor typography does not depend on a font CDN and covers Sorani Kurdish.
- Keep A4 imposition in shared millimetre-based PrintSheet and pure layout helpers; reuse LabelCanvas with exact axis scales so rotated previews match physical A7 output.
- Persist code format in product JSON and text styling in element JSON with optional fields so older saved labels remain compatible.
- Database schema lives in `supabase/setup.sql` (idempotent; the user runs it manually in the Supabase SQL Editor). It defines profiles + permissions, admin RPCs (`admin_*`), label_products (+`inventory_item_id` link), inventory_items/inventory_movements + `adjust_stock`, and label_templates (shop-shared custom label templates). Standalone patches for older DBs: `supabase/inventory-link.sql`, `supabase/templates.sql`. Quantities only change via `adjust_stock` (a trigger rejects direct updates) so every change is logged.
- Permission keys must stay identical in `src/lib/permissions.ts` and `public.permission_keys()`. UI gating uses `useSession().can()`; real enforcement is RLS / SECURITY DEFINER checks.
- All pages render inside `AppShell` (header, mandatory login, access guard). Session/language live in `SessionProvider` (root route).
- Login is username + password only (no Google, no self sign-up). Usernames map to `<username>@s3r.local` Supabase emails; create accounts with `bun run create-user <username> <password>` (uses `SUPABASE_SERVICE_ROLE_KEY` from `.env`).
- Desktop EXE: `bun run build:desktop` builds with `NITRO_PRESET=node-server`, copies `.output` into `desktop/server`, and runs electron-builder outside OneDrive (`%LOCALAPPDATA%\s3r-build`) to avoid EPERM; EXEs are copied to `desktop/release`. Never put the service role key into `desktop/env.json`.
- Node is not installed on this machine; only Bun. Electron inherits `ELECTRON_RUN_AS_NODE` from the IDE terminal — unset it before launching Electron manually.
- Cloudflare deploy (GitHub-connected Workers Builds): build command `npm run build` (or `bun run build`), deploy command `npx wrangler deploy --name s3r-sticker-creator`. `vite build` emits `.output/server/wrangler.json` plus a `.wrangler/deploy/config.json` redirect, so wrangler finds the config without a root wrangler file. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables — `.env` is gitignored and Vite inlines VITE_* at build time. No runtime vars are needed; never set `SUPABASE_SERVICE_ROLE_KEY` in Cloudflare.
- If the live DB predates inventory linking, run `supabase/inventory-link.sql` (adds `label_products.inventory_item_id`). The app degrades gracefully while the column is absent via the `hasLinkColumn()` probe in `src/lib/inventory-link.ts`.
