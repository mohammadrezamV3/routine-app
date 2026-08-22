// قالبِ ایمیلِ کدِ ورود — HTML با استایلِ inline (کلاینت‌های ایمیل عمدتاً
// CSS خارجی/تگ <style> رو یا نادیده می‌گیرن یا حذف می‌کنن، پس همه‌جا inline).
// خودِ کد همیشه دینامیک از پارامترِ ورودی میاد، هیچ‌جا هاردکد نیست.

export function renderOtpEmail(code: string): { subject: string; html: string; text: string } {
  const subject = "کد ورود به Arion";

  const text = [
    "Arion",
    "کد ورود شما",
    "",
    code,
    "",
    "این کد تا ۱۰ دقیقه‌ی دیگر معتبر است.",
    "اگر این درخواست از طرف شما نبوده، این پیام را نادیده بگیرید.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="fa" dir="rtl">
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
                <span style="font-family: Arial, sans-serif; font-size:20px; font-weight:700; color:#00A86B; letter-spacing:0.5px;">Arion</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px; text-align:center;">
                <p style="margin:0 0 6px; font-size:14px; color:#5b6660; direction:rtl;">کد ورود شما</p>
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
                <p style="margin:0; font-size:13px; color:#5b6660; direction:rtl; line-height:1.7;">این کد تا ۱۰ دقیقه‌ی دیگر معتبر است.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 30px; text-align:center;">
                <p style="margin:0; font-size:12px; color:#8b9791; direction:rtl; line-height:1.7;">اگر این درخواست از طرف شما نبوده، با خیال راحت این ایمیل را نادیده بگیرید — هیچ اقدامی برای حساب شما انجام نمی‌شود.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px; border-top:1px solid #eef1ef; text-align:center;">
                <p style="margin:0; font-size:11px; color:#a9b2ae;">Arion</p>
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
