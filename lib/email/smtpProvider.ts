import nodemailer from "nodemailer";
import type { EmailProvider, SendMailInput, SendMailResult } from "./types";

// اطلاعاتِ SMTP از env — هیچ‌وقت هاردکد یا کامیت نمی‌شن (مثلِ الگوی
// MELIPAYAMAK_* توی lib/sms.ts). هیچ فرضِ خاصی درباره‌ی providerِ SMTP
// (Gmail/Zoho/سرورِ اختصاصی) نداره — فقط host/port/user/pass/secure استاندارد.
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM;
// "1" | "true" یعنی TLSِ implicit (معمولاً پورت ۴۶۵)؛ خالی/false یعنی
// STARTTLS روی پورتِ معمولیِ ۵۸۷ (پیش‌فرضِ اکثرِ providerهای SMTP امروزی).
const SMTP_SECURE = process.env.SMTP_SECURE === "1" || process.env.SMTP_SECURE === "true";

function isConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASSWORD && SMTP_FROM);
}

let cachedTransporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    // بدونِ این سقف‌ها، یک SMTPِ درحالِ کندی/گیرکردن می‌تونه یک API route
    // رو تا timeoutِ کلیِ سرور معلق نگه داره
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return cachedTransporter;
}

// حسابِ آزمایشیِ Ethereal (nodemailer) — یک صندوقِ SMTPِ واقعی ولی جعلی،
// مخصوصِ توسعه‌ی محلی وقتی SMTP_* هنوز تنظیم نشده. مزیتش نسبت به لاگ‌کردنِ
// کد این‌جاست که قانونِ «OTP هیچ‌وقت توی لاگ نره» رو نقض نمی‌کنه — فقط یک
// لینکِ پیش‌نمایش (به همون ایمیلِ واقعاً رندرشده) لاگ می‌شه، نه خودِ کد.
let etherealTransporterPromise: Promise<nodemailer.Transporter> | null = null;
function getEtherealTransporter(): Promise<nodemailer.Transporter> {
  if (!etherealTransporterPromise) {
    etherealTransporterPromise = nodemailer.createTestAccount().then((account) =>
      nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
      })
    );
  }
  return etherealTransporterPromise;
}

export class SmtpEmailProvider implements EmailProvider {
  async sendMail(input: SendMailInput): Promise<SendMailResult> {
    if (!isConfigured()) {
      if (process.env.NODE_ENV === "production") {
        // برخلافِ الگوی lib/sms.ts (که در نبودِ تنظیمات «موفقِ شبیه‌سازی‌شده»
        // برمی‌گردونه)، این‌جا در production عمداً شکست واقعی برمی‌گردونیم —
        // یک OTP که هیچ‌وقت به کاربر نمی‌رسه نباید پشتِ یک ok:true قایم بشه.
        console.error("[email] SMTP_* تنظیم نشده — در production نمی‌تونه ایمیل بفرسته");
        return { ok: false, simulated: true };
      }
      // dev بدونِ SMTPِ واقعی: از طریقِ Ethereal واقعاً ارسال می‌کنیم (به یک
      // صندوقِ آزمایشی، نه به input.to) و فقط لینکِ پیش‌نمایش رو لاگ می‌کنیم —
      // خودِ کد هیچ‌جای لاگ ظاهر نمی‌شه.
      try {
        const transporter = await getEtherealTransporter();
        const info = await transporter.sendMail({
          from: "Arion Dev <dev@arion.local>",
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
        });
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.warn(`[email:dev] SMTP تنظیم نشده — ایمیل از طریقِ Ethereal ارسال شد. برای دیدنِ کد این لینک رو باز کن: ${previewUrl}`);
        return { ok: true, simulated: true };
      } catch (err: any) {
        console.error(`[email:dev] ارسالِ آزمایشی از طریقِ Ethereal هم شکست خورد: ${err?.message || err}`);
        return { ok: false, simulated: true };
      }
    }

    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: SMTP_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      return { ok: true, simulated: false };
    } catch (err: any) {
      // پیامِ خطا ممکنه شاملِ جزئیاتِ SMTP باشه (نه خودِ OTP) — امن برای لاگه
      console.error(`[email] خطا در ارسال ایمیل به ${input.to}: ${err?.message || err}`);
      return { ok: false, simulated: false };
    }
  }
}
