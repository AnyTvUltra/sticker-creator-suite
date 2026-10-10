import { z } from 'zod';
import headphones from '@/assets/headphones.jpg';

export type Language = 'ar' | 'ckb';
export const productSchema = z.object({
  name: z.string().trim().min(1).max(120), model: z.string().max(100),
  color: z.string().max(60), size: z.string().max(60), specs: z.string().max(500),
  warranty: z.string().max(100), barcode: z.string().regex(/^[\x20-\x7E]{1,40}$/),
  store: z.string().max(80), image: z.string().max(3000000),
});
export type Product = z.infer<typeof productSchema>;
export type ElementKind = 'store' | 'name' | 'model' | 'photo' | 'details' | 'specs' | 'warranty' | 'barcode' | 'footer' | 'text' | 'line';
export type LabelElement = { id: string; kind: ElementKind; x: number; y: number; width: number; height: number; visible: boolean; text?: string; fontSize?: number; bold?: boolean; align?: 'right' | 'center' | 'left' };
export type DocumentState = { product: Product; elements: LabelElement[]; theme: string };
export const sampleProduct: Product = { name: 'سماعات لاسلكية', model: 'SONY WH-1000XM5', color: 'أبيض', size: 'قياسي', specs: 'عزل ضوضاء نشط • اتصال بلوتوث 5.2\nبطارية تدوم حتى 30 ساعة', warranty: 'ضمان لمدة سنة', barcode: '6291041500213', store: 'متجر التقنية', image: headphones };
export const defaultElements: LabelElement[] = [
  { id:'store',kind:'store',x:25,y:23,width:300,height:26,visible:true },
  { id:'name',kind:'name',x:20,y:57,width:310,height:43,visible:true },
  { id:'model',kind:'model',x:25,y:104,width:300,height:21,visible:true },
  { id:'photo',kind:'photo',x:90,y:137,width:170,height:148,visible:true },
  { id:'details',kind:'details',x:28,y:292,width:294,height:35,visible:true },
  { id:'specs',kind:'specs',x:24,y:338,width:302,height:39,visible:true },
  { id:'warranty',kind:'warranty',x:28,y:388,width:294,height:29,visible:true },
  { id:'barcode',kind:'barcode',x:40,y:427,width:270,height:45,visible:true },
  { id:'footer',kind:'footer',x:25,y:478,width:300,height:14,visible:true },
];
export const words = {
  ar: { brand:'وسم', subtitle:'مساحة صغيرة، تفاصيل كبيرة', editor:'محرر الملصقات', products:'المنتجات', templates:'القوالب', heading:'صمّم ملصقك، بطريقتك', description:'كل تفاصيل منتجك، في ملصق واحد.', save:'حفظ المنتج', print:'طباعة الملصق', data:'بيانات المنتج', design:'التصميم', info:'تفاصيل المنتج', name:'اسم المنتج', model:'الموديل', color:'اللون', size:'الحجم', specs:'المواصفات', warranty:'الضمان', barcode:'الباركود', photo:'صورة المنتج', changePhoto:'تغيير الصورة', elements:'عناصر التصميم', add:'إضافة عنصر', text:'نص', image:'صورة', line:'خط', layers:'الطبقات', colors:'لون الملصق', selected:'العنصر المحدد', store:'اسم المتجر', newProduct:'منتج جديد', saved:'محفوظ', unsaved:'تغييرات غير محفوظة', ready:'جاهز للطباعة', portrait:'عمودي', landscape:'أفقي', copies:'عدد النسخ', preview:'معاينة الطباعة', login:'تسجيل الدخول', email:'البريد الإلكتروني', password:'كلمة المرور', signup:'إنشاء حساب', logout:'تسجيل الخروج', library:'مكتبة المنتجات', empty:'لم تحفظ أي منتجات بعد', emptyText:'ستظهر منتجاتك المحفوظة هنا.', delete:'حذف', edit:'تعديل', search:'ابحث عن منتج...', footer:'شكرًا لاختياركم متجرنا', hide:'إخفاء', show:'إظهار', standard:'كلاسيكي', compact:'مختصر', sizeFont:'حجم الخط', cancel:'إلغاء', savedToast:'تم حفظ المنتج والتصميم', failure:'تعذر الحفظ، حاول مجددًا', authRequired:'سجّل الدخول لحفظ منتجاتك بشكل خاص', invalid:'أدخل اسم المنتج وباركود صالحًا', reset:'إعادة التصميم', customText:'نص جديد' },
  ckb: { brand:'وەسم', subtitle:'شوێنی بچووک، وردەکاری زۆر', editor:'دەستکاریکەری لیبڵ', products:'بەرهەمەکان', templates:'قاڵبەکان', heading:'لیبڵەکەت بە شێوازی خۆت دروست بکە', description:'هەموو وردەکارییەکانی بەرهەمەکەت، لە یەک لیبڵدا.', save:'پاشەکەوتکردنی بەرهەم', print:'چاپکردنی لیبڵ', data:'زانیاری بەرهەم', design:'دیزاین', info:'وردەکاری بەرهەم', name:'ناوی بەرهەم', model:'مۆدێل', color:'ڕەنگ', size:'قەبارە', specs:'تایبەتمەندییەکان', warranty:'گەرەنتی', barcode:'بارکۆد', photo:'وێنەی بەرهەم', changePhoto:'گۆڕینی وێنە', elements:'توخمەکانی دیزاین', add:'زیادکردنی توخم', text:'دەق', image:'وێنە', line:'هێڵ', layers:'چینەکان', colors:'ڕەنگی لیبڵ', selected:'توخمی دیاریکراو', store:'ناوی فرۆشگا', newProduct:'بەرهەمی نوێ', saved:'پاشەکەوتکراو', unsaved:'گۆڕانکاری پاشەکەوتنەکراو', ready:'ئامادەی چاپ', portrait:'ستوونی', landscape:'ئاسۆیی', copies:'ژمارەی کۆپی', preview:'پێشبینینی چاپ', login:'چوونەژوورەوە', email:'ئیمەیڵ', password:'وشەی نهێنی', signup:'دروستکردنی هەژمار', logout:'چوونەدەرەوە', library:'کتێبخانەی بەرهەمەکان', empty:'هێشتا بەرهەمت پاشەکەوت نەکردووە', emptyText:'بەرهەمە پاشەکەوتکراوەکانت لێرە دەردەکەون.', delete:'سڕینەوە', edit:'دەستکاری', search:'گەڕان بۆ بەرهەم...', footer:'سوپاس بۆ هەڵبژاردنی فرۆشگاکەمان', hide:'شاردنەوە', show:'پیشاندان', standard:'کلاسیک', compact:'کورت', sizeFont:'قەبارەی فۆنت', cancel:'پاشگەزبوونەوە', savedToast:'بەرهەم و دیزاین پاشەکەوت کران', failure:'پاشەکەوت نەکرا، دووبارە هەوڵ بدە', authRequired:'بۆ پاشەکەوتکردنی بەرهەمەکانت بچۆ ژوورەوە', invalid:'ناوی بەرهەم و بارکۆدی دروست بنووسە', reset:'دیزاینەکە نوێ بکەرەوە', customText:'دەقی نوێ' },
};