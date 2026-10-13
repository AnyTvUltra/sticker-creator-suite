import { createFileRoute, redirect } from '@tanstack/react-router';
// Products were merged into the inventory; keep the old URL working for bookmarks.
export const Route = createFileRoute('/products')({
  beforeLoad: () => { throw redirect({ to: '/inventory', replace: true }); },
});
