import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { consumePasswordAttempt, findUserByIdentifier, identifierRateKey, startSmsTwoFactor, timingSafePasswordCheck } from "@/lib/credentials";

// POST /api/auth/2fa/start { identifier, password }
//
// مرحله‌ی اول ورود وقتی دومرحله‌ای روشنه: رمز این‌جا بررسی می‌شه و اگه درست
// بود یک کد پیامکی می‌ره. نشستی این‌جا صادر نمی‌شه — صدور نشست فقط از
// provider «sms-2fa» توی lib/auth.ts انجام می‌شه که خودش کد رو دوباره از
// صفر اعتبارسنجی می‌کنه.
//
// پاسخ عمدا بین «رمز غلط» و «کاربر وجود نداره» فرق نمی‌ذاره (همون قرارداد
// ضد user-enumeration بقیه‌ی اپ): هر دو حالت `{ required: false }` برمی‌گردونن
// تا فرانت مسیر عادی ورود رو ادامه بده و همون‌جا خطای عمومی بگیره.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers as any);
  if (!(await checkRateLimit(`2fa-start-ip:${ip}`, 10, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد تلاش‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!identifier || !password) return NextResponse.json({ required: false });

  if (!(await checkRateLimit(`2fa-start-id:${identifierRateKey(identifier)}`, 8, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد تلاش‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  // جستجوی کاربر و صدور/ارسالِ کد با lib/credentials.ts مشترکه (همون مسیری
  // که ورودِ اپ موبایل هم می‌ره).
  const user = await findUserByIdentifier(identifier);
  const eligible = !!user && !!user.passwordHash && !user.isBlocked && !user.deletedAt && user.twoFactorEnabled && !!user.phone;

  if (!eligible) {
    // رمز این‌جا سنجیده نمی‌شه (مسیرِ بعدیِ فرانت، credentials، می‌سنجه و سطلِ
    // مشترک رو همون‌جا مصرف می‌کنه)، ولی compareِ ساختگی اجرا می‌شه تا زمانِ
    // پاسخ نگه «این شناسه حسابِ دومرحله‌ای نیست/وجود نداره».
    await timingSafePasswordCheck(password, null);
    return NextResponse.json({ required: false });
  }
  // این‌جا رمز واقعا سنجیده می‌شه → همون سطلِ «حدسِ رمزِ» ورود (login-ip/login-id)،
  // نه سقفِ جدا. پرشدنش مثلِ رمزِ غلط جواب می‌گیره تا فرانت مسیرِ عادی رو بره
  // (که اونم rate-limited ـه و پیامِ عمومی می‌ده) — 429ِ مخصوصِ این‌جا لو می‌داد
  // که این شناسه یک حسابِ دومرحله‌ایه.
  if (!(await consumePasswordAttempt(identifier, ip))) {
    await timingSafePasswordCheck(password, null);
    return NextResponse.json({ required: false });
  }
  if (!(await timingSafePasswordCheck(password, user!.passwordHash))) {
    return NextResponse.json({ required: false });
  }

  const started = await startSmsTwoFactor(user!);
  if (!started.ok) {
    return NextResponse.json({ error: "ارسال پیامک ناموفق بود — کمی بعد دوباره امتحان کن" }, { status: 502 });
  }

  // فقط چهار رقم آخر شماره نشون داده می‌شه، نه کل شماره
  return NextResponse.json({ required: true, phoneHint: started.phoneHint, simulated: started.simulated });
}
