import { createFileRoute } from '@tanstack/react-router';
import { InventoryPage } from '@/components/inventory/inventory-page';

export const Route = createFileRoute('/inventory')({
  head: () => ({ meta: [{ title: 'المخزن — وسم' }, { name: 'description', content: 'إدارة البضاعة والكميات والأسعار وسجل حركات المخزون.' }] }),
  component: InventoryPage,
});
