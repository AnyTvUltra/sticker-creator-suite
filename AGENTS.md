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
