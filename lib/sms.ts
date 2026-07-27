// ارسال پیامک OTP — پیش‌فرض روی Kavenegar (رایج‌ترین سرویس پیامکی ایرانی،
// API ساده‌ی REST). اگه KAVENEGAR_API_KEY تنظیم نشده باشه (هنوز سرویس واقعی
// وصل نشده)، به‌جای شکست خوردن یا وانمود کردن ارسال موفق، کد رو توی لاگ سرور
// می‌نویسه — تا جریان OTP قابل تست باشه بدون این‌که رفتارش دروغ باشه.
const KAVENEGAR_API_KEY = process.env.KAVENEGAR_API_KEY;
const KAVENEGAR_SENDER = process.env.KAVENEGAR_SENDER || "";

export async function sendOtpSms(phone: string, code: string): Promise<{ ok: boolean; simulated: boolean }> {
  const message = `کد بازیابی رمز روتین من: ${code}\nاین کد تا ۱۰ دقیقه معتبره و به هیچ‌کس ندش.`;

  if (!KAVENEGAR_API_KEY) {
    console.warn(`[sms] KAVENEGAR_API_KEY تنظیم نشده — کد OTP برای ${phone} فقط توی لاگ سرور نوشته می‌شه: ${code}`);
    return { ok: true, simulated: true };
  }

  try {
    const params = new URLSearchParams({ receptor: phone, sender: KAVENEGAR_SENDER, message });
    const res = await fetch(`https://api.kavenegar.com/v1/${KAVENEGAR_API_KEY}/sms/send.json?${params.toString()}`);
    if (!res.ok) {
      console.error(`[sms] خطا در ارسال پیامک به ${phone}: HTTP ${res.status}`);
      return { ok: false, simulated: false };
    }
    return { ok: true, simulated: false };
  } catch (err: any) {
    console.error(`[sms] خطا در اتصال به سرویس پیامکی: ${err?.message || err}`);
    return { ok: false, simulated: false };
  }
}
