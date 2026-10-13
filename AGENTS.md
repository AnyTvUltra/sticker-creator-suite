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
- Products live in the inventory: one `inventory_items` row = one product, and its linked `label_products` row (`inventory_item_id`) is that product's label design. There is no separate products page (`/products` redirects to `/inventory`). Editor "save" creates the inventory item when missing and mirrors name/model/barcode/photo back to it (`itemFieldsFromProduct`); "save as new product" forks a new item + label. Item-linked labels are shared with staff via RLS (`supabase/shared-labels.sql`); unlinked labels stay owner-private and appear in the inventory's "convert" strip. sessionStorage is only a transient navigation draft.
- Use a 350 × 497 logical label canvas and scale the shared renderer for exact 74 × 105 mm A7 printing; persisted element positions use this logical coordinate space.
- Bundle the Arabic font locally so the editor typography does not depend on a font CDN and covers Sorani Kurdish.
- Keep A4 imposition in shared millimetre-based PrintSheet and pure layout helpers; reuse LabelCanvas with exact axis scales so rotated previews match physical A7 output.
- Persist code format in product JSON and text styling in element JSON with optional fields so older saved labels remain compatible.
- Database schema lives in `supabase/setup.sql` (idempotent; the user runs it manually in the Supabase SQL Editor). It defines profiles + permissions, admin RPCs (`admin_*`), label_products (+`inventory_item_id` link), inventory_items/inventory_movements + `adjust_stock`, label_templates (shop-shared custom label templates), and orders/order_items (restaurant-style customer orders). Standalone patches for older DBs: `supabase/inventory-link.sql`, `supabase/templates.sql`, `supabase/orders.sql`, `supabase/shared-labels.sql`. Quantities only change via `adjust_stock` (a trigger rejects direct updates) so every change is logged.
- Orders snapshot product name/price into `order_items` (items stay linked via `inventory_item_id`); ordering does NOT decrement stock — stock changes still go through `adjust_stock`. `orders` is added to the `supabase_realtime` publication; AppShell subscribes to INSERT and toasts users with `orders.view` (skipping the creator). Order statuses: new → preparing → done, or cancelled.
- Barcode scanning uses `@zxing/browser` (`src/components/scan/barcode-scanner.tsx`, rear-camera `decodeFromConstraints`, CODE128/EAN/UPC/QR/DataMatrix). The `/scan` page looks up `inventory_items` by barcode/sku then `label_products` by `data->>barcode`; the same scanner is embedded as a dialog in the inventory and product-library search boxes (scan fills the search field). Requires camera permission — localhost/HTTPS only.
- Permission keys must stay identical in `src/lib/permissions.ts` and `public.permission_keys()`. UI gating uses `useSession().can()`; real enforcement is RLS / SECURITY DEFINER checks.
- All pages render inside `AppShell` (header, mandatory login, access guard). Session/language live in `SessionProvider` (root route).
- Login is username + password only (no Google, no self sign-up). Usernames map to `<username>@s3r.local` Supabase emails; create accounts with `bun run create-user <username> <password>` (uses `SUPABASE_SERVICE_ROLE_KEY` from `.env`).
- Desktop EXE: `bun run build:desktop` builds with `NITRO_PRESET=node-server`, copies `.output` into `desktop/server`, and runs electron-builder outside OneDrive (`%LOCALAPPDATA%\s3r-build`) to avoid EPERM; EXEs are copied to `desktop/release`. Never put the service role key into `desktop/env.json`.
- Node is not installed on this machine; only Bun. Electron inherits `ELECTRON_RUN_AS_NODE` from the IDE terminal — unset it before launching Electron manually.
- Cloudflare deploy (GitHub-connected Workers Builds): build command `npm run build` (or `bun run build`), deploy command `npx wrangler deploy --name s3r-sticker-creator`. `vite build` emits `.output/server/wrangler.json` plus a `.wrangler/deploy/config.json` redirect, so wrangler finds the config without a root wrangler file. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables — `.env` is gitignored and Vite inlines VITE_* at build time. No runtime vars are needed; never set `SUPABASE_SERVICE_ROLE_KEY` in Cloudflare.
- If the live DB predates inventory linking, run `supabase/inventory-link.sql` (adds `label_products.inventory_item_id`). The app degrades gracefully while the column is absent via the `hasLinkColumn()` probe in `src/lib/inventory-link.ts`.
