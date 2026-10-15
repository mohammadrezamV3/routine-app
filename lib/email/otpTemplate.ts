// قالب ایمیل کد تک‌بارمصرف — HTML با استایل inline (کلاینت‌های ایمیل عمدتا
// CSS خارجی/تگ <style> رو یا نادیده می‌گیرن یا حذف می‌کنن، پس همه‌جا inline).
// خود کد همیشه دینامیک از پارامتر ورودی میاد، هیچ‌جا هاردکد نیست.
//
// purpose="login" (پیش‌فرض) برای ورود بدون‌رمز؛ "change-email" برای تایید
// مالکیت ایمیل جدید موقع تغییر ایمیل حساب از پنل کاربری — متنش عمدا
// جداست چون «کد ورود» توی این کانتکست گمراه‌کننده/نگران‌کننده بود (کاربر
// فکر می‌کرد یعنی کسی داره وارد حسابش می‌شه، نه اینکه خودش داره ایمیل عوض می‌کنه).
import { brandName } from "@/lib/brand";
import { tr, isEn } from "@/lib/i18n";

export type OtpEmailPurpose = "login" | "change-email";

// تابع (نه ثابت سطح ماژول) تا زبان هر درخواست جدا انتخاب بشه؛ این تابع داخل
// خود درخواست API اجرا می‌شه، پس tr() زبان کوکی همون کاربر رو می‌خونه.
const copy = (purpose: OtpEmailPurpose): { subject: string; heading: string } => {
  const BRAND = brandName();
  return purpose === "change-email"
    ? { subject: tr(`کد تایید تغییر ایمیل در ${BRAND}`, `${BRAND} email change verification code`), heading: tr("کد تایید ایمیل جدید", "Verification code for your new email") }
    : { subject: tr(`کد ورود به ${BRAND}`, `Your ${BRAND} login code`), heading: tr("کد ورود شما", "Your login code") };
};

export function renderOtpEmail(code: string, purpose: OtpEmailPurpose = "login"): { subject: string; html: string; text: string } {
  const { subject, heading } = copy(purpose);
  const BRAND_FA = brandName(); // نام برند به زبان جاری (در فارسی همون «آریون» قبلی)
  const en = isEn();
  const dir = en ? "ltr" : "rtl";
  const bodyLine = tr("این کد تا 10 دقیقه‌ی دیگر معتبر است.", "This code is valid for 10 more minutes.");
  const ignoreText = tr("اگر این درخواست از طرف شما نبوده، این پیام را نادیده بگیرید.", "If you did not make this request, please ignore this message.");
  const ignoreHtml = tr("اگر این درخواست از طرف شما نبوده، با خیال راحت این ایمیل را نادیده بگیرید — هیچ اقدامی برای حساب شما انجام نمی‌شود.", "If you did not make this request, you can safely ignore this email. No action will be taken on your account.");

  const text = [
    BRAND_FA,
    heading,
    "",
    code,
    "",
    bodyLine,
    ignoreText,
  ].join("\n");

  const html = `<!doctype html>
<html lang="${en ? "en" : "fa"}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f5; font-family: Tahoma, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f5; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e6e9e7;">
            <tr>
              <td style="background-color:#06120c; padding:22px 28px; text-align:center;">
                <span style="font-family: Tahoma, Arial, sans-serif; font-size:20px; font-weight:700; color:#00A86B; letter-spacing:0.5px;">${BRAND_FA}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px; text-align:center;">
                <p style="margin:0 0 6px; font-size:14px; color:#5b6660; direction:${dir};">${heading}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px; text-align:center;">
                <div style="display:inline-block; padding:14px 28px; border-radius:12px; background-color:#f0f9f5; border:1px solid #cdeee0;">
                  <span style="font-family: 'Courier New', monospace; font-size:32px; font-weight:700; letter-spacing:8px; color:#06120c; direction:ltr; display:inline-block;">${code}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 8px; text-align:center;">
                <p style="margin:0; font-size:13px; color:#5b6660; direction:${dir}; line-height:1.7;">${bodyLine}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 30px; text-align:center;">
                <p style="margin:0; font-size:12px; color:#8b9791; direction:${dir}; line-height:1.7;">${ignoreHtml}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px; border-top:1px solid #eef1ef; text-align:center;">
                <p style="margin:0; font-size:11px; color:#a9b2ae;">${BRAND_FA}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
