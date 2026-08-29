// اتصال به درگاه زرین‌پال — رست ساده (بدون SDK جدا). دو تا endpoint لازمه:
// PaymentRequest (ساخت تراکنش + گرفتن لینک پرداخت) و PaymentVerification
// (بعد از برگشتِ کاربر، تاییدِ واقعیِ پرداخت). مبلغ همیشه به ریال (نه تومان)
// طبق مستنداتِ زرین‌پال. اگه ZARINPAL_MERCHANT_ID ست نشه، درخواست‌ها با خطای
// روشن fail می‌شن (نه silent) — چک‌اوت واقعی بدون مرچنت‌آیدی معنی نداره.

const ZARINPAL_REQUEST_URL = "https://api.zarinpal.com/pg/v4/payment/request.json";
const ZARINPAL_VERIFY_URL = "https://api.zarinpal.com/pg/v4/payment/verify.json";
const ZARINPAL_GATEWAY_URL = "https://www.zarinpal.com/pg/StartPay/";

// همان دلیلِ lib/zibal.ts: `fetch` در Node تایم‌اوتِ پیش‌فرض ندارد، ولی nginx
// دارد — پس بدون این، یک درگاهِ کند به‌جای خطای روشن، یک ۵۰۴ـِ HTML از nginx
// می‌شد که کلاینت نمی‌توانست پارسش کند و کاربر پیامِ گمراه‌کننده‌ی «مشکلی در
// اتصال به سرور» را می‌دید. عمداً کمتر از proxy_read_timeout است.
const GATEWAY_TIMEOUT_MS = 12_000;

async function postJson(url: string, payload: unknown): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    });
  } catch (e: any) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      throw new Error("درگاهِ زرین‌پال در زمانِ مقرر پاسخ نداد — چند لحظه دیگر دوباره امتحان کن");
    }
    throw new Error("اتصال به درگاهِ زرین‌پال برقرار نشد — چند لحظه دیگر دوباره امتحان کن");
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`پاسخِ نامعتبر از درگاهِ زرین‌پال (کدِ ${res.status})`);
  }
}

function getMerchantId(): string {
  const id = process.env.ZARINPAL_MERCHANT_ID;
  if (!id) throw new Error("ZARINPAL_MERCHANT_ID تنظیم نشده — پرداخت واقعی ممکن نیست");
  return id;
}

export async function zarinpalRequestPayment(opts: {
  amountRial: number;
  description: string;
  callbackUrl: string;
  mobile?: string;
}): Promise<{ authority: string; paymentUrl: string }> {
  const data = await postJson(ZARINPAL_REQUEST_URL, {
    merchant_id: getMerchantId(),
    amount: opts.amountRial,
    description: opts.description,
    callback_url: opts.callbackUrl,
    metadata: opts.mobile ? { mobile: opts.mobile } : undefined,
  });
  const authority = data?.data?.authority;
  if (!authority || data?.data?.code !== 100) {
    const errMsg = data?.errors?.message || "خطا در اتصال به درگاه پرداخت";
    throw new Error(errMsg);
  }
  return { authority, paymentUrl: `${ZARINPAL_GATEWAY_URL}${authority}` };
}

export async function zarinpalVerifyPayment(opts: {
  amountRial: number;
  authority: string;
}): Promise<{ ok: boolean; refId?: string; errorMessage?: string }> {
  const data = await postJson(ZARINPAL_VERIFY_URL, {
    merchant_id: getMerchantId(),
    amount: opts.amountRial,
    authority: opts.authority,
  });
  // کد ۱۰۰ = تاییدِ موفق، ۱۰۱ = قبلاً تایید شده (idempotent، بازم موفق حساب می‌شه)
  const code = data?.data?.code;
  if (code === 100 || code === 101) {
    return { ok: true, refId: String(data?.data?.ref_id ?? "") };
  }
  return { ok: false, errorMessage: data?.errors?.message || "پرداخت تایید نشد" };
}
