import { createFileRoute } from '@tanstack/react-router';
import { LabelEditor } from '@/components/label-editor/editor';
export const Route = createFileRoute('/templates')({
  head:()=>({meta:[{title:'قوالب الملصقات — وسم'},{name:'description',content:'اختر قالب ملصق A7 كلاسيكيًا أو مختصرًا وخصص الألوان وتفاصيل المنتجات.'},{property:'og:title',content:'قوالب الملصقات — وسم'},{property:'og:description',content:'قوالب جميلة قابلة للتخصيص لملصقات المنتجات.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
  component:()=> <LabelEditor view="templates"/>,
});