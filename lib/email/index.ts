import { SmtpEmailProvider } from "./smtpProvider";
import type { EmailProvider } from "./types";
import { renderOtpEmail, OtpEmailPurpose } from "./otpTemplate";
import { renderWeeklyLetterEmail } from "./weeklyLetterTemplate";
import { getSiteUrl } from "@/lib/siteUrl";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";

// انتخاب Provider — فعلا همیشه SMTP، ولی این سوییچ برای همینه که بعدا
// (Resend/SES/Brevo) فقط یک provider تازه پیاده بشه و این‌جا یک کیس اضافه
// بشه؛ هیچ‌جای دیگه‌ی اپ (routeها، authorize) نباید تغییر کنه. مثال آینده:
//
//   case "resend": return new ResendEmailProvider();
//   case "ses":    return new SesEmailProvider();
//   case "brevo":  return new BrevoEmailProvider();
//
const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();

function getProvider(): EmailProvider {
  switch (EMAIL_PROVIDER) {
    case "smtp":
    default:
      return new SmtpEmailProvider();
  }
}

export type { EmailProvider, SendMailInput, SendMailResult } from "./types";

/** ارسال ایمیل کد تک‌بارمصرف — تنها نقطه‌ی ورودی‌ای که بقیه‌ی اپ باهاش کار می‌کنه. */
export async function sendOtpEmail(to: string, code: string, purpose: OtpEmailPurpose = "login"): Promise<{ ok: boolean; simulated: boolean }> {
  const { subject, html, text } = renderOtpEmail(code, purpose);
  return getProvider().sendMail({ to, subject, html, text });
}

/**
 * ارسال ایمیل «هفته‌نامه». url لینک مطلق (یا مسیر نسبی) خود شماره‌ست و دکمه‌ی
 * ایمیل به همون می‌ره؛ قالب HTML در weeklyLetterTemplate.ts.
 */
export async function sendWeeklyLetterEmail(to: string, data: WeeklyLetterData, url: string): Promise<{ ok: boolean; simulated: boolean }> {
  const siteUrl = getSiteUrl();
  const abs = /^https?:\/\//i.test(url) ? url : `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  const { subject, html, text } = renderWeeklyLetterEmail(data, { url: abs, siteUrl });
  return getProvider().sendMail({ to, subject, html, text });
}
