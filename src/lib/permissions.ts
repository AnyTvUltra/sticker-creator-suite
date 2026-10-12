import type { Language } from '@/components/label-editor/model';

// Keep in sync with public.permission_keys() in supabase/setup.sql.
export const PERMISSIONS = ['labels.design', 'labels.print', 'labels.save', 'labels.delete', 'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.stock', 'inventory.delete', 'orders.view', 'orders.create', 'orders.update', 'orders.delete'] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const permissionGroups: { key: 'labels' | 'inventory' | 'orders'; items: Permission[] }[] = [
  { key: 'labels', items: ['labels.design', 'labels.print', 'labels.save', 'labels.delete'] },
  { key: 'inventory', items: ['inventory.view', 'inventory.create', 'inventory.edit', 'inventory.stock', 'inventory.delete'] },
  { key: 'orders', items: ['orders.view', 'orders.create', 'orders.update', 'orders.delete'] },
];

export const permissionPresets: { key: 'seller' | 'storekeeper' | 'designer' | 'all'; items: Permission[] }[] = [
  { key: 'seller', items: ['labels.print', 'inventory.view', 'orders.view', 'orders.create'] },
  { key: 'storekeeper', items: ['inventory.view', 'inventory.create', 'inventory.edit', 'inventory.stock', 'inventory.delete', 'orders.view'] },
  { key: 'designer', items: ['labels.design', 'labels.print', 'labels.save', 'labels.delete', 'inventory.view'] },
  { key: 'all', items: [...PERMISSIONS] },
];

type Text = { title: string; hint: string };
export const permissionText: Record<Language, { groups: Record<'labels' | 'inventory' | 'orders', string>; presets: Record<'seller' | 'storekeeper' | 'designer' | 'all', string>; items: Record<Permission, Text> }> = {
  ar: {
    groups: { labels: 'الملصقات', inventory: 'المخزن', orders: 'الطلبات' },
    presets: { seller: 'بائع', storekeeper: 'أمين مخزن', designer: 'مصمم', all: 'كل الصلاحيات' },
    items: {
      'labels.design': { title: 'تصميم الملصقات', hint: 'فتح المحرر والقوالب وتعديل التصميم' },
      'labels.print': { title: 'طباعة الملصقات', hint: 'معاينة وطباعة الملصقات على A7 أو A4' },
      'labels.save': { title: 'حفظ الملصقات', hint: 'حفظ التصاميم في مكتبة المنتجات وتعديلها' },
      'labels.delete': { title: 'حذف الملصقات', hint: 'حذف التصاميم المحفوظة من المكتبة' },
      'inventory.view': { title: 'عرض المخزن', hint: 'رؤية البضاعة والكميات والأسعار وسجل الحركات' },
      'inventory.create': { title: 'إضافة بضاعة', hint: 'إضافة أصناف جديدة إلى المخزن' },
      'inventory.edit': { title: 'تعديل البضاعة', hint: 'تعديل الاسم والسعر والصورة وبقية البيانات' },
      'inventory.stock': { title: 'إدخال وإخراج الكميات', hint: 'زيادة أو إنقاص الكمية مع تسجيل الحركة' },
      'inventory.delete': { title: 'حذف البضاعة', hint: 'حذف أصناف من المخزن نهائيًا' },
      'orders.view': { title: 'عرض الطلبات', hint: 'رؤية كل طلبات الزبائن والإشعار اللحظي بالطلبات الجديدة' },
      'orders.create': { title: 'إنشاء طلب', hint: 'فتح طلب جديد باسم الزبون وإضافة أصناف إليه' },
      'orders.update': { title: 'تعديل الطلبات', hint: 'تغيير حالة الطلب (جديد/قيد التجهيز/مكتمل/ملغي) وتعديل أصنافه' },
      'orders.delete': { title: 'حذف الطلبات', hint: 'حذف الطلبات نهائيًا' },
    },
  },
  ckb: {
    groups: { labels: 'لیبڵەکان', inventory: 'کۆگا', orders: 'داواکارییەکان' },
    presets: { seller: 'فرۆشیار', storekeeper: 'کۆگاوان', designer: 'دیزاینەر', all: 'هەموو دەسەڵاتەکان' },
    items: {
      'labels.design': { title: 'دیزاینی لیبڵ', hint: 'کردنەوەی دەستکاریکەر و قاڵبەکان و گۆڕینی دیزاین' },
      'labels.print': { title: 'چاپکردنی لیبڵ', hint: 'پێشبینین و چاپکردنی لیبڵ لەسەر A7 یان A4' },
      'labels.save': { title: 'پاشەکەوتکردنی لیبڵ', hint: 'پاشەکەوتکردنی دیزاین لە کتێبخانە و دەستکاریکردنی' },
      'labels.delete': { title: 'سڕینەوەی لیبڵ', hint: 'سڕینەوەی دیزاینە پاشەکەوتکراوەکان' },
      'inventory.view': { title: 'بینینی کۆگا', hint: 'بینینی کاڵا و بڕ و نرخ و تۆماری جوڵەکان' },
      'inventory.create': { title: 'زیادکردنی کاڵا', hint: 'زیادکردنی کاڵای نوێ بۆ کۆگا' },
      'inventory.edit': { title: 'دەستکاریکردنی کاڵا', hint: 'گۆڕینی ناو و نرخ و وێنە و زانیارییەکانی تر' },
      'inventory.stock': { title: 'هاتن و چوونی بڕ', hint: 'زیادکردن یان کەمکردنەوەی بڕ لەگەڵ تۆمارکردنی جوڵە' },
      'inventory.delete': { title: 'سڕینەوەی کاڵا', hint: 'سڕینەوەی کاڵا لە کۆگا بە یەکجاری' },
      'orders.view': { title: 'بینینی داواکارییەکان', hint: 'بینینی هەموو داواکارییەکانی کڕیاران و ئاگاداربوونەوەی خێرا لە داواکارییە نوێکان' },
      'orders.create': { title: 'دروستکردنی داواکاری', hint: 'کردنەوەی داواکارییەکی نوێ بە ناوی کڕیار و زیادکردنی کاڵا بۆی' },
      'orders.update': { title: 'دەستکاریکردنی داواکارییەکان', hint: 'گۆڕینی دۆخی داواکاری (نوێ/ئامادەکراوە/تەواوبوو/هەڵوەشایەوە) و دەستکاریکردنی کاڵاکانی' },
      'orders.delete': { title: 'سڕینەوەی داواکارییەکان', hint: 'سڕینەوەی داواکارییەکان بە یەکجاری' },
    },
  },
};
