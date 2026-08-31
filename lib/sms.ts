// ارسال پیامک OTP از طریق ملی‌پیامک با متد «ارسال با الگو» (BaseNumber)،
// نه متد SendOtp. دلیلِ سوییچ: متد SendOtp با این‌که RetStatus:1 (موفق)
// برمی‌گردوند، پیامک روی خطوطی که «مسدودیِ پیامک‌های تبلیغاتی» فعال دارن
// توسط اپراتور silently drop می‌شد و هیچ‌وقت به گوشی نمی‌رسید — چون از یه
// خطِ خدماتیِ عمومی/بدون الگوی تاییدشده می‌اومد. الگوی ثابتِ تاییدشده
// (BodyId) از این فیلتر رد می‌شه چون از قبل توسط اپراتور/ملی‌پیامک به‌عنوان
// پیامکِ خدماتیِ واقعی احراز شده.
// مستندات: https://www.melipayamak.com/api/sendbybasenumber/
//
// اگه اطلاعات پنل (یوزرنیم/رمز/کد الگو) تنظیم نشده باشه، به‌جای شکست
// خوردن یا وانمود کردن ارسال موفق، کد رو توی لاگ سرور می‌نویسه — تا جریان
// OTP قابل تست باشه بدون این‌که رفتارش دروغ باشه.
import { logError } from "./errorLog";

/** شماره را برای لاگ ماسک می‌کند — نباید شماره‌ی کاملِ کاربر در جدولِ خطا بنشیند */
function maskPhone(phone: string): string {
  return phone.length >= 7 ? `${phone.slice(0, 4)}***${phone.slice(-3)}` : "***";
}

const MELIPAYAMAK_USERNAME = process.env.MELIPAYAMAK_USERNAME;
const MELIPAYAMAK_PASSWORD = process.env.MELIPAYAMAK_PASSWORD;
const MELIPAYAMAK_PATTERN_ID = process.env.MELIPAYAMAK_PATTERN_ID;

export async function sendOtpSms(phone: string, code: string): Promise<{ ok: boolean; simulated: boolean }> {
  if (!MELIPAYAMAK_USERNAME || !MELIPAYAMAK_PASSWORD || !MELIPAYAMAK_PATTERN_ID) {
    console.warn(`[sms] اطلاعات ملی‌پیامک (MELIPAYAMAK_USERNAME/MELIPAYAMAK_PASSWORD/MELIPAYAMAK_PATTERN_ID) تنظیم نشده — کد OTP برای ${phone} فقط توی لاگ سرور نوشته می‌شه: ${code}`);
    // این حالت روی production یعنی «هیچ پیامکی ارسال نمی‌شود» ولی کاربر
    // پیامِ موفقیت می‌بیند — دقیقاً همان حالتی که تشخیصش سخت است. پس
    // صریح در جدولِ خطا ثبت می‌شود تا در پنل ادمین دیده شود.
    logError("sms", "اطلاعات ملی‌پیامک تنظیم نشده — هیچ پیامکی ارسال نمی‌شود", {
      severity: "CRITICAL",
      context: { phone: maskPhone(phone) },
    });
    return { ok: true, simulated: true };
  }

  try {
    const body = new URLSearchParams({
      username: MELIPAYAMAK_USERNAME,
      password: MELIPAYAMAK_PASSWORD,
      text: code,
      to: phone,
      bodyId: MELIPAYAMAK_PATTERN_ID,
    });
    const res = await fetch("https://rest.payamak-panel.com/api/SendSMS/BaseNumber", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      // تنها فراخوانیِ خروجیِ اپ که سقفِ زمان نداشت. چون ارسال
      // fire-and-forget است، یک ملی‌پیامکِ بی‌جواب یعنی یک Promiseِ معلق که
      // تا تایم‌اوتِ TCPِ سیستم‌عامل (چند دقیقه) حافظه و سوکت نگه می‌دارد.
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`[sms] خطا در ارسال پیامک به ${phone}: HTTP ${res.status}`);
      logError("sms", `ملی‌پیامک HTTP ${res.status} برگرداند`, {
        context: { phone: maskPhone(phone), status: res.status },
      });
      return { ok: false, simulated: false };
    }
    const data = await res.json();
    if (data?.RetStatus !== 1) {
      console.error(`[sms] ملی‌پیامک ارسال رو رد کرد برای ${phone}: ${data?.StrRetStatus} (کد ${data?.RetStatus})`);
      // رایج‌ترین دلیل‌ها: اتمامِ اعتبار، غیرفعال‌شدنِ الگو، یا مسدودشدنِ IP
      // سرور. متنِ خودِ ملی‌پیامک نگه داشته می‌شود چون همان تفاوت را می‌گوید.
      logError("sms", `ملی‌پیامک ارسال را رد کرد: ${data?.StrRetStatus ?? "بدون توضیح"} (کد ${data?.RetStatus})`, {
        context: { phone: maskPhone(phone), retStatus: data?.RetStatus, strRetStatus: data?.StrRetStatus },
      });
      return { ok: false, simulated: false };
    }
    return { ok: true, simulated: false };
  } catch (err: any) {
    console.error(`[sms] خطا در اتصال به سرویس پیامکی: ${err?.message || err}`);
    logError("sms", `اتصال به سرویس پیامکی برقرار نشد: ${err?.message || err}`, {
      context: { phone: maskPhone(phone), code: err?.cause?.code },
    });
    return { ok: false, simulated: false };
  }
}
