// تشخیص «دستگاه ضعیف» و علامت‌گذاری آن روی <html>.
//
// مسئله‌ای که حل می‌کند: این اپ حدود ۱۵۰ جا `backdrop-filter` دارد (افکت
// شیشه‌ای) با شعاع‌های بلور تا ۳۴px. روی GPUهای رده بالا رایگان است، ولی
// روی گوشی‌های ارزان اندرویدی هر فریم اسکرول باید کل محتوای پشت هر
// کارت را دوباره نمونه‌برداری و بلور کند — و چون این عناصر ثابت/چسبانند،
// این کار در *هر* فریم تکرار می‌شود. نتیجه‌اش همان لگ و داغ‌شدنی است که
// گزارش شد.
//
// چرا این‌طوری و نه ساده‌کردن طراحی برای همه: طراحی برای دستگاه‌هایی که
// از پسش برمی‌آیند **هیچ تغییری نمی‌کند**. فقط دستگاهی که واقعا کم‌توان
// است یک نسخه‌ی سبک‌تر می‌گیرد.
//
// چرا اسکریپت inline و نه useEffect: باید *قبل از اولین پینت* اجرا شود،
// وگرنه دستگاه ضعیف اول نسخه‌ی سنگین را رندر می‌کند (همان هزینه‌ای که
// می‌خواستیم حذف کنیم) و بعد پرش می‌کند به نسخه‌ی سبک.
//
// معیار: **هر دستگاه لمسی**.
//
// نسخه‌ی اول این فایل سخت‌گیرتر بود (فقط deviceMemory ≤ ۴ یا ≤ ۴ هسته) و
// در عمل روی گوشی‌های واقعی فعال نمی‌شد — یک گوشی ۸ گیگی هم گزارش لگ
// می‌داد چون مسئله رم نیست، **GPU** است. حتی پرچم‌دارها هم یک GPU موبایل
// با پهنای‌باند حافظه‌ی محدود دارند، و بلور ۲۸ پیکسلی پشت یک هدر ثابت
// در هر فریم اسکرول دوباره محاسبه می‌شود.
//
// دسکتاپ (pointer:fine) هیچ‌وقت علامت نمی‌خورد و افکت شیشه‌ای کاملش را
// نگه می‌دارد.
import { COMPAT_POLYFILLS_SCRIPT } from "@/lib/compatScript";

export const PERF_TIER_ATTR = "data-perf";

// ردیف دوم («ضعیف»): فقط روی همون دستگاه‌های لمسی، و فقط وقتی سیگنال
// سخت‌افزاری واقعا پایین باشه — ≤۴ هسته، ≤۴GB رم (navigator.deviceMemory؛
// فقط کروم/اندروید گزارشش می‌کنه، روی iOS undefinedه و این شرط بی‌اثره)، یا
// حالت صرفه‌جویی داده، یا مرورگر قدیمی (بدون aspect-ratio یعنی سافاری قبل از 15 / کروم
// قبل از 88؛ این مرورگرها معمولا روی سخت‌افزار قدیمی‌ان). این ردیف چند افکت باقی‌مانده رو هم برمی‌داره
// (globals.css → «ردیف ضعیف»)؛ گوشی لمسی قوی هیچ تغییری نمی‌بینه.
export const PERF_WEAK_ATTR = "data-perf-weak";

// جایگزین‌های APIهای قدیمی (lib/compatScript.ts) همین‌جا سوار می‌شن چون این اسکریپت
// از قبل بالای body و قبل از باندل اجرا می‌شه.
export const PERF_INIT_SCRIPT = COMPAT_POLYFILLS_SCRIPT + `(function(){try{
var coarse=window.matchMedia&&window.matchMedia("(pointer:coarse)").matches;
if(!coarse)return;
var d=document.documentElement;
d.setAttribute("${PERF_TIER_ATTR}","low");
var n=navigator,mem=n.deviceMemory,cores=n.hardwareConcurrency,c=n.connection;
var old=!(window.CSS&&CSS.supports&&CSS.supports("aspect-ratio","1"));
if(old||(mem&&mem<=4)||(cores&&cores<=4)||(c&&c.saveData))d.setAttribute("${PERF_WEAK_ATTR}","");
document.addEventListener("touchstart",function(){},{passive:true});
}catch(e){}})();`;

// آن `touchstart` خالی یک لیسنر بی‌کار نیست: سافاری iOS حالت `:active`
// را فقط روی عناصری اعمال می‌کند که در مسیر رویدادشان یک هندلر لمس وجود
// داشته باشد. بدون آن، هر بازخورد لمسی CSS روی آیفون *اصلا دیده نمی‌شود*
// — همان «می‌زنم ولی هیچ واکنشی نشان نمی‌دهد». passive است، پس روی اسکرول
// هیچ اثری ندارد.

/** روی کلاینت: آیا این دستگاه رده پایین علامت خورده؟ */
export function isLowPerfDevice(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute(PERF_TIER_ATTR) === "low";
}
