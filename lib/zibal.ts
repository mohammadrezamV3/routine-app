// اتصال به درگاه زیبال. مرچنت‌کد از env می‌آد (ZIBAL_MERCHANT_KEY)، هیچ‌وقت
// توی سورس هاردکد نمی‌شه — همون قاعده‌ی lib/zarinpal.ts. مبلغ به ریاله.
const BASE = "https://gateway.zibal.ir";

function getMerchantKey(): string {
  const key = process.env.ZIBAL_MERCHANT_KEY;
  if (!key) throw new Error("ZIBAL_MERCHANT_KEY تنظیم نشده — پرداخت واقعی ممکن نیست");
  return key;
}

export async function zibalRequest(amountRial: number, callbackUrl: string, description = "") {
  const res = await fetch(`${BASE}/v1/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant: getMerchantKey(),
      amount: amountRial,
      callbackUrl,
      description,
    }),
  });
  const data = await res.json();
  if (data.result !== 100) throw new Error(`Zibal request failed: ${data.message}`);
  return {
    trackId: data.trackId as number,
    paymentUrl: `${BASE}/start/${data.trackId}`,
  };
}

export async function zibalVerify(trackId: number) {
  const res = await fetch(`${BASE}/v1/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant: getMerchantKey(), trackId }),
  });
  const data = await res.json();
  return {
    ok: data.result === 100 || data.result === 201, // ۲۰۱ = قبلاً تایید شده (idempotent)
    result: data.result,
    message: data.message,
    refNumber: data.refNumber,
    amount: data.amount as number | undefined,
  };
}
