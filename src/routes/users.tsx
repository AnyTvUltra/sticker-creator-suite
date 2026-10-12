import { createFileRoute } from '@tanstack/react-router';
import { UsersPage } from '@/components/admin/users-page';

export const Route = createFileRoute('/users')({
  head: () => ({ meta: [{ title: 'المستخدمون — وسم' }, { name: 'description', content: 'إدارة حسابات الفريق وصلاحياتهم.' }] }),
  component: UsersPage,
});
