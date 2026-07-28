// ارسال پیامک OTP از طریق ملی‌پیامک (متد SendOtp). این متد متنِ پیامک رو
// خودش با یک قالب ثابت و از‌پیش‌تاییدشده می‌فرسته («کد تایید شما Code: xxxxx»)
// پس فقط کد رو می‌گیریم، نه متن دلخواه.
// مستندات: https://www.melipayamak.com/api/sendotp/
//
// اگه اطلاعات پنل (یوزرنیم/رمز/شماره فرستنده) تنظیم نشده باشه، به‌جای شکست
// خوردن یا وانمود کردن ارسال موفق، کد رو توی لاگ سرور می‌نویسه — تا جریان
// OTP قابل تست باشه بدون این‌که رفتارش دروغ باشه.
const MELIPAYAMAK_USERNAME = process.env.MELIPAYAMAK_USERNAME;
const MELIPAYAMAK_PASSWORD = process.env.MELIPAYAMAK_PASSWORD;
const MELIPAYAMAK_FROM = process.env.MELIPAYAMAK_FROM;

export async function sendOtpSms(phone: string, code: string): Promise<{ ok: boolean; simulated: boolean }> {
  if (!MELIPAYAMAK_USERNAME || !MELIPAYAMAK_PASSWORD || !MELIPAYAMAK_FROM) {
    console.warn(`[sms] اطلاعات ملی‌پیامک (MELIPAYAMAK_USERNAME/MELIPAYAMAK_PASSWORD/MELIPAYAMAK_FROM) تنظیم نشده — کد OTP برای ${phone} فقط توی لاگ سرور نوشته می‌شه: ${code}`);
    return { ok: true, simulated: true };
  }

  try {
    const body = new URLSearchParams({
      username: MELIPAYAMAK_USERNAME,
      password: MELIPAYAMAK_PASSWORD,
      to: phone,
      from: MELIPAYAMAK_FROM,
      code,
    });
    const res = await fetch("https://rest.payamak-panel.com/api/SendSMS/SendOtp", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      console.error(`[sms] خطا در ارسال پیامک به ${phone}: HTTP ${res.status}`);
      return { ok: false, simulated: false };
    }
    const data = await res.json();
    if (data?.RetStatus !== 1) {
      console.error(`[sms] ملی‌پیامک ارسال رو رد کرد برای ${phone}: ${data?.StrRetStatus} (کد ${data?.RetStatus})`);
      return { ok: false, simulated: false };
    }
    return { ok: true, simulated: false };
  } catch (err: any) {
    console.error(`[sms] خطا در اتصال به سرویس پیامکی: ${err?.message || err}`);
    return { ok: false, simulated: false };
  }
}
