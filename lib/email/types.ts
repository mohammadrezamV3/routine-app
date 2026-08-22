// انتزاعِ سرویسِ ایمیل — هر Provider (SMTP، بعداً Resend/SES/Brevo) فقط این
// یک قرارداد رو پیاده می‌کنه. بقیه‌ی اپ (routeها، authorize) هیچ‌وقت مستقیم
// با nodemailer یا هر SDKِ دیگه‌ای کار نمی‌کنه، فقط با همین interface.

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendMailResult = {
  ok: boolean;
  // true یعنی ایمیل واقعاً ارسال نشده (تنظیمات Provider ناقصه) — فقط توی
  // dev مجازه؛ در production باید ok:false برگرده، نه یک ارسالِ الکی موفق.
  simulated: boolean;
};

export interface EmailProvider {
  sendMail(input: SendMailInput): Promise<SendMailResult>;
}
