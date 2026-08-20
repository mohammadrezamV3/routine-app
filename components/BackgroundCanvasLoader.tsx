"use client";

import dynamic from "next/dynamic";

// عمداً بدونِ ssr:false — چون خروجیِ بصریِ این کامپوننت (بلاب‌های aurora)
// کاملاً استاتیک/CSSـه (useEffectش فقط لیسنرِ پارالاکسِ ماوس رو اضافه
// می‌کنه، چیزی رو رندر نمی‌کنه)، پس جایی برای هیدریت‌شدن نداره که SSRِش
// خطر ایجاد کنه. با ssr:false این بلاب‌ها یه لحظه بعدِ هدر/منو ظاهر
// می‌شدن (چون chunkِ جداش باید بعدِ هیدریت دانلود/اجرا بشه)؛ بدونش همون
// اولین HTMLِ سرور بک‌گراند رو داره، هم‌زمان با بقیه‌ی صفحه. dynamic()
// همچنان برای جدا نگه‌داشتنِ باندل (anime.js و منطقش) نگه داشته شده.
const BackgroundCanvas = dynamic(
  () => import("./BackgroundCanvas").then((m) => m.BackgroundCanvas)
);

export function BackgroundCanvasLoader() {
  return <BackgroundCanvas />;
}
