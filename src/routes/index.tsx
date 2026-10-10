import { createFileRoute } from "@tanstack/react-router";
import { LabelEditor } from '@/components/label-editor/editor';

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: 'وسم — محرر ملصقات المنتجات' },
    { name: 'description', content: 'صمم ملصقات منتجات A7 بالسحب والإفلات، مع الباركود والطباعة ودعم العربية والكوردية السورانية.' },
    { property: 'og:title', content: 'وسم — محرر ملصقات المنتجات' },
    { property: 'og:description', content: 'تفاصيل منتجك في ملصق واحد. تصميم A7 وحفظ المنتجات وإعادة طباعتها.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: () => <LabelEditor />,
});
