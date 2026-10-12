import { createFileRoute } from '@tanstack/react-router';
import { OrdersPage } from '@/components/orders/orders-page';

export const Route = createFileRoute('/orders')({
  head: () => ({ meta: [{ title: 'الطلبات — S3R' }, { name: 'description', content: 'إنشاء طلبات الزبائن وتتبع حالتها مع إشعارات لحظية للمدير.' }] }),
  component: OrdersPage,
});
