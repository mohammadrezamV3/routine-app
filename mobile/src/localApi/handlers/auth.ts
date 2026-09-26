// POST /api/auth/2fa/start — shimِ محلی روی ورودِ موبایل (/api/mobile/auth/login
// از راهِ SyncProvider.login). قراردادِ خروجی همون روتِ وبه:
//   • حسابِ دومرحله‌ای، رمز درست ← { required: true, phoneHint }
//   • بقیه (ورودِ موفق، یا رمز/شناسه‌ی غلط — بدونِ تمایز، ضد enumeration) ←
//     { required: false }؛ صفحه بعدش signIn("credentials") می‌زنه که نتیجه‌ی
//     همین تلاش رو از authBridge برمی‌داره (ورودِ دوم نمی‌ره).
//   • 429 ← همون 429 با پیامِ سرور
// توکن‌ها در ورودِ موفق همین‌جا ذخیره شدن (tokenStore)؛ signIn فقط تأییدش می‌کنه.
import { ApiError } from "@m/sync/apiClient";
import { recordPreLogin, whenAuthReady } from "@m/shims/authBridge";
import { json } from "../respond";
import type { LocalCtx } from "../types";

export async function start2fa({ req }: LocalCtx): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!identifier || !password) return json({ required: false });

  const bridge = await whenAuthReady();
  try {
    const r = await bridge.login(identifier, password);
    if (r.status === "2fa") return json({ required: true, phoneHint: r.phoneHint });
    recordPreLogin(identifier, password, { ok: true });
    return json({ required: false });
  } catch (err) {
    recordPreLogin(identifier, password, { ok: false, error: err });
    if (err instanceof ApiError && err.kind === "http" && err.status === 429) {
      return json({ error: err.serverMessage || "تعداد تلاش‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, 429);
    }
    // رمز غلط/شبکه: مسیرِ عادیِ صفحه (signIn) همون نتیجه رو گزارش می‌کنه
    return json({ required: false });
  }
}
