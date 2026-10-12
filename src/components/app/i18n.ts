import type { Language } from '@/components/label-editor/model';

const ar = {
  inventory: 'المخزن', users: 'المستخدمون', username: 'اسم المستخدم', password: 'الرمز', login: 'تسجيل الدخول', logout: 'تسجيل الخروج',
  loginTitle: 'مرحبًا بعودتك', loginHint: 'سجّل الدخول بحسابك للمتابعة', loginFailed: 'اسم المستخدم أو الرمز غير صحيح',
  noAccess: 'ليست لديك صلاحية لهذه الصفحة', noAccessHint: 'اطلب من المدير منحك الصلاحية المناسبة.', noPages: 'لم تُمنح أي صلاحية بعد. تواصل مع المدير.',
  setupNeeded: 'قاعدة البيانات غير مهيأة', setupHint: 'شغّل ملف supabase/setup.sql في Supabase SQL Editor ثم أعد المحاولة.', retry: 'إعادة المحاولة',
  admin: 'مدير', disabled: 'معطّل', loading: 'جارٍ التحميل...',
  // inventory
  invTitle: 'المخزن', invSubtitle: 'كل بضاعتك في مكان واحد، مع الكميات والأسعار وسجل الحركات.', addItem: 'إضافة بضاعة', editItem: 'تعديل البضاعة',
  statItems: 'الأصناف', statUnits: 'إجمالي القطع', statLow: 'مخزون منخفض', statValue: 'قيمة المخزون',
  searchItems: 'ابحث بالاسم أو الباركود أو الرمز أو الفئة...', allCategories: 'كل الفئات', allStock: 'كل الحالات', inStock: 'متوفر', lowStock: 'منخفض', outStock: 'نفد',
  sortNewest: 'الأحدث', sortName: 'الاسم', sortQtyAsc: 'الأقل كمية', sortPriceDesc: 'الأعلى سعرًا',
  name: 'اسم المنتج', model: 'الموديل', category: 'الفئة', sku: 'رمز الصنف (SKU)', barcode: 'الباركود', color: 'اللون', size: 'الحجم', warranty: 'الضمان', specs: 'المواصفات',
  location: 'مكان التخزين', notes: 'ملاحظات', price: 'سعر البيع', cost: 'سعر الشراء', quantity: 'الكمية', minQuantity: 'حد التنبيه', image: 'الصورة', changeImage: 'تغيير الصورة', removeImage: 'إزالة',
  generate: 'توليد', save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', makeLabel: 'إنشاء ملصق', details: 'التفاصيل',
  openLabel: 'فتح الملصق', hasLabel: 'له ملصق', linkInventory: 'ربط بصنف من المخزن', linkedTo: 'مرتبط بالمخزن', refreshFromInventory: 'تحديث من المخزن',
  unlink: 'فك الربط', pickItem: 'اختر صنفًا من المخزن', refreshed: 'تم تحديث بيانات الملصق من المخزن', notLinked: 'غير مرتبط بالمخزن', linkedMissing: 'الصنف المرتبط لم يعد موجودًا',
  createInInventory: 'إنشاء صنف في المخزن', createdLinked: 'أُنشئ الصنف في المخزن ورُبط بهذا الملصق — عدّل سعره وكميته من صفحة المخزن',
  myTemplates: 'قوالب المحل', saveCurrentAsTemplate: 'حفظ التصميم الحالي كقالب', templateName: 'اسم القالب', saveAsTemplate: 'حفظ كقالب', templateSaved: 'حُفظ القالب',
  noCustomTemplates: 'لا قوالب مخصصة بعد — احفظ تصميمك الحالي أو أي منتج محفوظ كقالب.', renameTemplate: 'إعادة تسمية', deleteTemplate: 'حذف القالب', confirmDeleteTemplate: 'هل تريد حذف هذا القالب؟',
  searchProducts: 'ابحث بالاسم أو الموديل أو الباركود...',
  confirmDelete: 'هل تريد حذف هذا الصنف نهائيًا؟', saved: 'تم الحفظ', deleted: 'تم الحذف', failed: 'تعذّر تنفيذ العملية', required: 'اسم المنتج مطلوب',
  emptyInv: 'المخزن فارغ', emptyInvHint: 'ابدأ بإضافة أول صنف إلى مخزنك.', noResults: 'لا توجد نتائج مطابقة',
  stockIn: 'إدخال', stockOut: 'إخراج', adjustStock: 'تعديل الكمية', amount: 'العدد', note: 'ملاحظة (اختياري)', apply: 'تنفيذ', insufficient: 'الكمية المتوفرة لا تكفي',
  history: 'سجل الحركات', noHistory: 'لا توجد حركات بعد', initial: 'رصيد افتتاحي', piece: 'قطعة', updated: 'آخر تحديث', profit: 'الربح للقطعة',
  imageTooBig: 'اختر صورة JPG أو PNG أو WebP أصغر من 2MB', quantityHint: 'لتغيير الكمية لاحقًا استخدم الإدخال والإخراج من بطاقة الصنف.',
  // users
  usersTitle: 'المستخدمون والصلاحيات', usersSubtitle: 'أنشئ حسابات لفريقك وحدد ما يستطيع كل شخص فعله.', newUser: 'إنشاء حساب', editUser: 'تعديل الحساب',
  displayName: 'الاسم الظاهر', newPassword: 'رمز جديد (اتركه فارغًا لعدم التغيير)', isAdmin: 'مدير (كل الصلاحيات + إدارة المستخدمين)', active: 'الحساب مفعّل',
  permissions: 'الصلاحيات', presets: 'قوالب جاهزة', selectAll: 'تحديد الكل', clearAll: 'إلغاء الكل', lastLogin: 'آخر دخول', never: 'لم يدخل بعد',
  you: 'أنت', permCount: 'صلاحية', allPerms: 'كل الصلاحيات', confirmDeleteUser: 'هل تريد حذف هذا الحساب نهائيًا؟', created: 'تم إنشاء الحساب',
  errUsernameTaken: 'اسم المستخدم مستخدم مسبقًا', errInvalidUsername: 'اسم المستخدم: أحرف إنجليزية وأرقام و . _ - فقط (2 حرف على الأقل)', errWeakPassword: 'الرمز يجب أن يكون 6 أحرف على الأقل',
  errSelf: 'لا يمكنك إلغاء صلاحية المدير أو تعطيل أو حذف حسابك', errNotAllowed: 'ليست لديك صلاحية',
  // orders
  orders: 'الطلبات', ordersTitle: 'طلبات الزبائن', ordersSubtitle: 'أنشئ طلبًا باسم الزبون وأضف الأصناف — يصل الإشعار للمدير فورًا.',
  newOrder: 'طلب جديد', customerName: 'اسم الزبون', customerRequired: 'اسم الزبون مطلوب', orderNotes: 'ملاحظات الطلب (اختياري)',
  cart: 'الطلب', cartEmpty: 'لا أصناف بعد — انقر على منتج لإضافته', addToOrder: 'إضافة', submitOrder: 'إرسال الطلب', orderTotal: 'المجموع',
  orderItems: 'الأصناف', orderBy: 'بواسطة', orderStatus: 'الحالة', statusNew: 'جديد', statusPreparing: 'قيد التجهيز', statusDone: 'مكتمل', statusCancelled: 'ملغي',
  startPreparing: 'بدء التجهيز', markDone: 'إكمال', cancelOrder: 'إلغاء الطلب', confirmDeleteOrder: 'هل تريد حذف هذا الطلب نهائيًا؟',
  orderSaved: 'أُرسل الطلب', orderUpdated: 'حُدّث الطلب', emptyOrders: 'لا توجد طلبات بعد', emptyOrdersHint: 'أنشئ أول طلب لزبونك من الزر أعلاه.',
  allOrders: 'الكل', orderNo: 'طلب', newOrderToast: 'طلب جديد وصل', tapToAdd: 'انقر لإضافته', each: 'للقطعة', itemsCount: 'صنف',
  searchOrderProducts: 'ابحث عن صنف بالاسم أو الموديل أو الباركود...', editOrder: 'تعديل الطلب', outOfStockShort: 'نفد المخزون',
  // scan
  scan: 'المسح', scanTitle: 'مسح الباركود', scanSubtitle: 'وجّه الكاميرا نحو الباركود أو أدخل الرمز يدويًا لعرض بيانات المنتج فورًا.',
  scanStart: 'تشغيل الكاميرا', scanStop: 'إيقاف الكاميرا', cameraOff: 'الكاميرا متوقفة', scanHint: 'ضع الباركود داخل الإطار',
  scanManual: 'أدخل الرمز يدويًا', scanGo: 'بحث', scanUsbHint: 'قارئ الباركود USB يعمل هنا أيضًا — امسح وسيظهر الناتج.', searching: 'جارٍ البحث…',
  scanNotFound: 'لم يُعثر على منتج بهذا الرمز', scanAgain: 'مسح رمز آخر', scannedCode: 'الرمز الممسوح',
  cameraDenied: 'تعذّر الوصول للكاميرا — امنح الإذن ثم أعد المحاولة', cameraError: 'لا توجد كاميرا أو المتصفح لا يدعمها',
  fromInventory: 'صنف من المخزن', fromProducts: 'منتج محفوظ (ملصق)', printLabel: 'طباعة ملصق', openInEditor: 'فتح في المحرر',
  scanFoundShort: 'تم العثور على الرمز',
};

const ckb: typeof ar = {
  inventory: 'کۆگا', users: 'بەکارهێنەران', username: 'ناوی بەکارهێنەر', password: 'وشەی نهێنی', login: 'چوونەژوورەوە', logout: 'چوونەدەرەوە',
  loginTitle: 'بەخێربێیتەوە', loginHint: 'بۆ بەردەوامبوون بە هەژمارەکەت بچۆ ژوورەوە', loginFailed: 'ناوی بەکارهێنەر یان وشەی نهێنی هەڵەیە',
  noAccess: 'دەسەڵاتی ئەم پەڕەیەت نییە', noAccessHint: 'داوا لە بەڕێوەبەر بکە دەسەڵاتی گونجاوت پێ بدات.', noPages: 'هێشتا هیچ دەسەڵاتێکت پێ نەدراوە. پەیوەندی بە بەڕێوەبەرەوە بکە.',
  setupNeeded: 'بنکەی زانیاری ئامادە نەکراوە', setupHint: 'فایلی supabase/setup.sql لە Supabase SQL Editor جێبەجێ بکە و دووبارە هەوڵ بدەرەوە.', retry: 'دووبارە هەوڵدانەوە',
  admin: 'بەڕێوەبەر', disabled: 'ناچالاک', loading: 'بارکردن...',
  invTitle: 'کۆگا', invSubtitle: 'هەموو کاڵاکانت لە یەک شوێندا، لەگەڵ بڕ و نرخ و تۆماری جوڵەکان.', addItem: 'زیادکردنی کاڵا', editItem: 'دەستکاریکردنی کاڵا',
  statItems: 'جۆرەکان', statUnits: 'کۆی پارچەکان', statLow: 'بڕی کەم', statValue: 'بەهای کۆگا',
  searchItems: 'بە ناو، بارکۆد، کۆد یان پۆل بگەڕێ...', allCategories: 'هەموو پۆلەکان', allStock: 'هەموو دۆخەکان', inStock: 'بەردەستە', lowStock: 'کەمە', outStock: 'نەماوە',
  sortNewest: 'نوێترین', sortName: 'ناو', sortQtyAsc: 'کەمترین بڕ', sortPriceDesc: 'بەرزترین نرخ',
  name: 'ناوی بەرهەم', model: 'مۆدێل', category: 'پۆل', sku: 'کۆدی کاڵا (SKU)', barcode: 'بارکۆد', color: 'ڕەنگ', size: 'قەبارە', warranty: 'گەرەنتی', specs: 'تایبەتمەندییەکان',
  location: 'شوێنی هەڵگرتن', notes: 'تێبینی', price: 'نرخی فرۆشتن', cost: 'نرخی کڕین', quantity: 'بڕ', minQuantity: 'سنووری ئاگادارکردنەوە', image: 'وێنە', changeImage: 'گۆڕینی وێنە', removeImage: 'لابردن',
  generate: 'دروستکردن', save: 'پاشەکەوتکردن', cancel: 'هەڵوەشاندنەوە', delete: 'سڕینەوە', edit: 'دەستکاری', makeLabel: 'دروستکردنی لیبڵ', details: 'وردەکاری',
  openLabel: 'کردنەوەی لیبڵ', hasLabel: 'لیبڵی هەیە', linkInventory: 'بەستنەوە بە کاڵایەکی کۆگا', linkedTo: 'بەستراوە بە کۆگا', refreshFromInventory: 'نوێکردنەوە لە کۆگا',
  unlink: 'لابردنی بەستنەوە', pickItem: 'کاڵایەک لە کۆگا هەڵبژێرە', refreshed: 'زانیاری لیبڵ لە کۆگاوە نوێکرایەوە', notLinked: 'نەبەستراوە بە کۆگا', linkedMissing: 'کاڵای بەستراو چیتر بوونی نییە',
  createInInventory: 'دروستکردنی کاڵا لە کۆگا', createdLinked: 'کاڵا لە کۆگا دروستکرا و بەم لیبڵەوە بەسترایەوە — نرخ و بڕی لە لاپەڕەی کۆگا بگۆڕە',
  myTemplates: 'قاڵبەکانی فرۆشگا', saveCurrentAsTemplate: 'دیزاینی ئێستا وەک قاڵب پاشەکەوت بکە', templateName: 'ناوی قاڵب', saveAsTemplate: 'وەک قاڵب پاشەکەوت بکە', templateSaved: 'قاڵب پاشەکەوتکرا',
  noCustomTemplates: 'هێشتا قاڵبی تایبەت نییە — دیزاینی ئێستا یان بەرهەمی پاشەکەوتکراو وەک قاڵب پاشەکەوت بکە.', renameTemplate: 'ناونانەوە', deleteTemplate: 'سڕینەوەی قاڵب', confirmDeleteTemplate: 'دڵنیایت لە سڕینەوەی ئەم قاڵبە؟',
  searchProducts: 'بە ناو، مۆدێل یان بارکۆد بگەڕێ...',
  confirmDelete: 'ئایا دەتەوێت ئەم کاڵایە بە یەکجاری بسڕیتەوە؟', saved: 'پاشەکەوت کرا', deleted: 'سڕایەوە', failed: 'کردارەکە سەرنەکەوت', required: 'ناوی بەرهەم پێویستە',
  emptyInv: 'کۆگا بەتاڵە', emptyInvHint: 'بە زیادکردنی یەکەم کاڵا دەست پێ بکە.', noResults: 'هیچ ئەنجامێک نییە',
  stockIn: 'هاتن', stockOut: 'چوون', adjustStock: 'گۆڕینی بڕ', amount: 'ژمارە', note: 'تێبینی (ئارەزوومەندانە)', apply: 'جێبەجێکردن', insufficient: 'بڕی بەردەست بەس نییە',
  history: 'تۆماری جوڵەکان', noHistory: 'هێشتا هیچ جوڵەیەک نییە', initial: 'باڵانسی سەرەتایی', piece: 'پارچە', updated: 'دوایین نوێکردنەوە', profit: 'قازانجی هەر پارچەیەک',
  imageTooBig: 'وێنەی JPG، PNG یان WebP کەمتر لە 2MB هەڵبژێرە', quantityHint: 'بۆ گۆڕینی بڕ دواتر، هاتن و چوون لە کارتی کاڵاکە بەکاربهێنە.',
  usersTitle: 'بەکارهێنەران و دەسەڵاتەکان', usersSubtitle: 'هەژمار بۆ تیمەکەت دروست بکە و دیاری بکە هەر کەسێک چی دەتوانێت بکات.', newUser: 'دروستکردنی هەژمار', editUser: 'دەستکاریکردنی هەژمار',
  displayName: 'ناوی پیشاندراو', newPassword: 'وشەی نهێنی نوێ (بەتاڵی بهێڵە بۆ نەگۆڕین)', isAdmin: 'بەڕێوەبەر (هەموو دەسەڵاتەکان + بەڕێوەبردنی بەکارهێنەران)', active: 'هەژمار چالاکە',
  permissions: 'دەسەڵاتەکان', presets: 'قاڵبی ئامادە', selectAll: 'هەڵبژاردنی هەموو', clearAll: 'لابردنی هەموو', lastLogin: 'دوایین چوونەژوورەوە', never: 'هێشتا نەچووەتە ژوورەوە',
  you: 'تۆ', permCount: 'دەسەڵات', allPerms: 'هەموو دەسەڵاتەکان', confirmDeleteUser: 'ئایا دەتەوێت ئەم هەژمارە بە یەکجاری بسڕیتەوە؟', created: 'هەژمار دروستکرا',
  errUsernameTaken: 'ئەم ناوی بەکارهێنەرە پێشتر بەکارهاتووە', errInvalidUsername: 'ناوی بەکارهێنەر: تەنها پیتی ئینگلیزی، ژمارە و . _ - (لانیکەم 2 پیت)', errWeakPassword: 'وشەی نهێنی دەبێت لانیکەم 6 پیت بێت',
  errSelf: 'ناتوانیت دەسەڵاتی بەڕێوەبەر لە خۆت بسەنیتەوە یان هەژمارەکەت ناچالاک بکەیت یان بیسڕیتەوە', errNotAllowed: 'دەسەڵاتت نییە',
  // orders
  orders: 'داواکارییەکان', ordersTitle: 'داواکارییەکانی کڕیار', ordersSubtitle: 'داواکارییەکی نوێ بە ناوی کڕیار دروست بکە و کاڵا زیاد بکە — بەڕێوەبەر دەستبەجێ ئاگادار دەبێتەوە.',
  newOrder: 'داواکاری نوێ', customerName: 'ناوی کڕیار', customerRequired: 'ناوی کڕیار پێویستە', orderNotes: 'تێبینی داواکاری (ئارەزوومەندانە)',
  cart: 'داواکاری', cartEmpty: 'هێشتا کاڵا نییە — کرتە لە کاڵایەک بکە بۆ زیادکردن', addToOrder: 'زیادکردن', submitOrder: 'ناردنی داواکاری', orderTotal: 'کۆی گشتی',
  orderItems: 'کاڵاکان', orderBy: 'لەلایەن', orderStatus: 'دۆخ', statusNew: 'نوێ', statusPreparing: 'ئامادەدەکرێت', statusDone: 'تەواوبوو', statusCancelled: 'هەڵوەشایەوە',
  startPreparing: 'دەستپێکردنی ئامادەکردن', markDone: 'تەواوکردن', cancelOrder: 'هەڵوەشاندنەوەی داواکاری', confirmDeleteOrder: 'دڵنیایت لە سڕینەوەی ئەم داواکارییە بە یەکجاری؟',
  orderSaved: 'داواکاری نێردرا', orderUpdated: 'داواکاری نوێکرایەوە', emptyOrders: 'هێشتا داواکاری نییە', emptyOrdersHint: 'یەکەم داواکاری بۆ کڕیارەکەت لە دوگمەی سەرەوە دروست بکە.',
  allOrders: 'هەموو', orderNo: 'داواکاری', newOrderToast: 'داواکارییەکی نوێ گەیشت', tapToAdd: 'کرتە بکە بۆ زیادکردن', each: 'بۆ هەر پارچەیەک', itemsCount: 'کاڵا',
  searchOrderProducts: 'بە ناو، مۆدێل یان بارکۆد بگەڕێ...', editOrder: 'دەستکاریکردنی داواکاری', outOfStockShort: 'کۆگا تەواوبوو',
  // scan
  scan: 'سکان', scanTitle: 'سکانی باڕکۆد', scanSubtitle: 'کامێرا بەرەو باڕکۆدەکە بەڕێبکە یان کۆدەکە بە دەست بنووسە بۆ پیشاندانی زانیاری بەرهەم.',
  scanStart: 'کامێرا بکەرەوە', scanStop: 'کامێرا بگرەوە', cameraOff: 'کامێرا گیراوە', scanHint: 'باڕکۆدەکە بخە ناو چوارچێوەکە',
  scanManual: 'کۆدەکە بە دەست بنووسە', scanGo: 'گەڕان', scanUsbHint: 'خوێنەری باڕکۆدی USB لێرەش کاردەکات — سکان بکە و ئەنجام دەردەکەوێت.', searching: 'دەگەڕێت…',
  scanNotFound: 'هیچ بەرهەمێک بەم کۆدە نەدۆزرایەوە', scanAgain: 'سکانی کۆدێکی تر', scannedCode: 'کۆدی سکانکراو',
  cameraDenied: 'نەتوانرا بگەڕێین بە کامێراوە — مۆڵەت بدە و دووبارە هەوڵبدەرەوە', cameraError: 'کامێرایەک نییە یان وێبگەڕەکە پشتیوانی ناکات',
  fromInventory: 'کاڵا لە کۆگا', fromProducts: 'بەرهەمی پاشەکەوتکراو (لیبڵ)', printLabel: 'چاپکردنی لیبڵ', openInEditor: 'کردنەوە لە ئێدیتر',
  scanFoundShort: 'کۆدەکە دۆزرایەوە',
};

export const ui = { ar, ckb } satisfies Record<Language, typeof ar>;

export function rpcError(message: string | undefined, t: typeof ar) {
  const m = message ?? '';
  if (m.includes('username_taken')) return t.errUsernameTaken;
  if (m.includes('invalid_username')) return t.errInvalidUsername;
  if (m.includes('weak_password')) return t.errWeakPassword;
  if (m.includes('cannot_change_self')) return t.errSelf;
  if (m.includes('insufficient_stock')) return t.insufficient;
  if (m.includes('not_allowed') || m.includes('row-level security')) return t.errNotAllowed;
  return t.failed;
}
