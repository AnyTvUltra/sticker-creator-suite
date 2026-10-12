import { createFileRoute } from '@tanstack/react-router';
import { ScanPage } from '@/components/scan/scan-page';

export const Route = createFileRoute('/scan')({
  head: () => ({ meta: [{ title: 'مسح الباركود — S3R' }, { name: 'description', content: 'مسح الباركود بالكاميرا لعرض بيانات المنتج فوراً.' }] }),
  component: ScanPage,
});
