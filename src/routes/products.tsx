import { createFileRoute } from '@tanstack/react-router';
import { LabelEditor } from '@/components/label-editor/editor';
export const Route = createFileRoute('/products')({
  head:()=>({meta:[{title:'المنتجات — وسم'},{name:'description',content:'مكتبة منتجاتك المحفوظة، لتعديل بياناتها وتصاميمها وإعادة طباعة ملصقاتها.'},{property:'og:title',content:'مكتبة المنتجات — وسم'},{property:'og:description',content:'منتجاتك وتصاميم الملصقات، محفوظة في مكان واحد.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
  component:()=> <LabelEditor view="products"/>,
});