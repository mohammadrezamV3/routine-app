// تشخیصِ «دستگاهِ ضعیف» و علامت‌گذاریِ آن روی <html>.
//
// مسئله‌ای که حل می‌کند: این اپ حدودِ ۱۵۰ جا `backdrop-filter` دارد (افکتِ
// شیشه‌ای) با شعاع‌های بلورِ تا ۳۴px. روی GPUهای ردهٔ بالا رایگان است، ولی
// روی گوشی‌های ارزانِ اندرویدی هر فریمِ اسکرول باید کلِ محتوای پشتِ هر
// کارت را دوباره نمونه‌برداری و بلور کند — و چون این عناصر ثابت/چسبانند،
// این کار در *هر* فریم تکرار می‌شود. نتیجه‌اش همان لگ و داغ‌شدنی است که
// گزارش شد.
//
// چرا این‌طوری و نه ساده‌کردنِ طراحی برای همه: طراحی برای دستگاه‌هایی که
// از پسش برمی‌آیند **هیچ تغییری نمی‌کند**. فقط دستگاهی که واقعاً کم‌توان
// است یک نسخه‌ی سبک‌تر می‌گیرد.
//
// چرا اسکریپتِ inline و نه useEffect: باید *قبل از اولین پینت* اجرا شود،
// وگرنه دستگاهِ ضعیف اول نسخه‌ی سنگین را رندر می‌کند (همان هزینه‌ای که
// می‌خواستیم حذف کنیم) و بعد پرش می‌کند به نسخه‌ی سبک.
//
// معیارها عمداً محافظه‌کارانه‌اند:
//   • فقط دستگاهِ لمسی (pointer:coarse) — هیچ دسکتاپی هرگز افت نمی‌کند.
//   • deviceMemory ≤ ۴ گیگ یا hardwareConcurrency ≤ ۴ هسته.
// سافاری/فایرفاکس `deviceMemory` را اصلاً پیاده نکرده‌اند (undefined
// می‌شود)، پس آیفون‌ها با این معیار علامت نمی‌خورند — که درست است، چون
// backdrop-filter روی آن‌ها شتاب‌دهیِ سخت‌افزاری کامل دارد.
export const PERF_TIER_ATTR = "data-perf";

export const PERF_INIT_SCRIPT = `(function(){try{
var n=navigator;
var coarse=window.matchMedia&&window.matchMedia("(pointer:coarse)").matches;
if(!coarse)return;
var mem=n.deviceMemory, cores=n.hardwareConcurrency;
var lowMem=typeof mem==="number"&&mem<=4;
var lowCpu=typeof cores==="number"&&cores<=4;
if(lowMem||lowCpu)document.documentElement.setAttribute("${PERF_TIER_ATTR}","low");
}catch(e){}})();`;

/** روی کلاینت: آیا این دستگاه ردهٔ پایین علامت خورده؟ */
export function isLowPerfDevice(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute(PERF_TIER_ATTR) === "low";
}
