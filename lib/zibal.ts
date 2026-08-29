// اتصال به درگاه زیبال. مرچنت‌کد از env می‌آد (ZIBAL_MERCHANT_KEY)، هیچ‌وقت
// توی سورس هاردکد نمی‌شه — همون قاعده‌ی lib/zarinpal.ts. مبلغ به ریاله.
const BASE = "https://gateway.zibal.ir";

// سقفِ انتظار برای پاسخِ درگاه.
//
// چرا لازم است: `fetch` در Node **هیچ تایم‌اوتِ پیش‌فرضی ندارد** — تا ابد
// منتظر می‌ماند. اما nginx (deploy/nginx.conf.example) روی `location /`
// یک `proxy_read_timeout` دارد؛ یعنی اگر درگاه کند باشد، *اول nginx*
// اتصال را می‌بندد و یک صفحه‌ی **HTML** با کدِ ۵۰۴ به مرورگر می‌دهد. آن‌وقت
// کلاینت که منتظرِ JSON است روی `res.json()` خطا می‌خورد و کاربر پیامِ
// گمراه‌کننده‌ی «مشکلی در اتصال به سرور پیش اومد» را می‌بیند — بدون هیچ
// سرنخی از این‌که در واقع درگاه دیر جواب داده.
//
// با این تایم‌اوت، خطا همیشه *داخلِ خودِ اپ* رخ می‌دهد و به‌صورت JSON با یک
// پیامِ فارسیِ دقیق برمی‌گردد. عدد از `proxy_read_timeout` کمتر است تا
// همیشه ما زودتر از nginx تصمیم بگیریم.
const GATEWAY_TIMEOUT_MS = 12_000;

// کدهای خطای زیبال به فارسی. پیامِ خامِ خودِ زیبال انگلیسی و برای کاربرِ
// نهایی بی‌معنی است.
const RESULT_MESSAGES: Record<number, string> = {
  102: "مرچنت‌کدِ درگاه نامعتبر است",
  103: "مرچنت‌کدِ درگاه غیرفعال است",
  104: "مرچنت‌کدِ درگاه نامعتبر است",
  105: "مبلغ باید بیشتر از ۱۰۰۰ ریال باشد",
  106: "آدرسِ بازگشت (callback) نامعتبر است — باید با http یا https شروع شود",
  113: "مبلغِ تراکنش از سقفِ مجازِ درگاه بیشتر است",
};

async function postJson(path: string, payload: unknown): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    });
  } catch (e: any) {
    // TimeoutError وقتی AbortSignal.timeout عمل کند؛ بقیه یعنی DNS/شبکه.
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      throw new Error("درگاهِ زیبال در زمانِ مقرر پاسخ نداد — چند لحظه دیگر دوباره امتحان کن");
    }
    throw new Error("اتصال به درگاهِ زیبال برقرار نشد — چند لحظه دیگر دوباره امتحان کن");
  }
  // درگاه ممکن است در خطاهای زیرساختی HTML بدهد نه JSON؛ آن‌وقت `res.json()`
  // یک خطای بی‌ربطِ پارس می‌داد. این‌جا صریح مدیریت می‌شود.
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`پاسخِ نامعتبر از درگاهِ زیبال (کدِ ${res.status})`);
  }
}

function getMerchantKey(): string {
  const key = process.env.ZIBAL_MERCHANT_KEY;
  if (!key) throw new Error("ZIBAL_MERCHANT_KEY تنظیم نشده — پرداخت واقعی ممکن نیست");
  return key;
}

export async function zibalRequest(amountRial: number, callbackUrl: string, description = "") {
  const data = await postJson("/v1/request", {
    merchant: getMerchantKey(),
    amount: amountRial,
    callbackUrl,
    description,
  });
  if (data.result !== 100) {
    throw new Error(RESULT_MESSAGES[data.result] || `خطای درگاهِ زیبال (کدِ ${data.result})`);
  }
  return {
    trackId: data.trackId as number,
    paymentUrl: `${BASE}/start/${data.trackId}`,
  };
}

export async function zibalVerify(trackId: number) {
  const data = await postJson("/v1/verify", { merchant: getMerchantKey(), trackId });
  return {
    ok: data.result === 100 || data.result === 201, // ۲۰۱ = قبلاً تایید شده (idempotent)
    result: data.result,
    message: data.message,
    refNumber: data.refNumber,
    amount: data.amount as number | undefined,
  };
}
