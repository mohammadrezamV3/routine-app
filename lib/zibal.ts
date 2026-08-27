const ZIBAL_MERCHANT = process.env.ZIBAL_MERCHANT_KEY!; // مرچنت کد رو تو .env بذار، اینجا نه
const BASE = "https://gateway.zibal.ir";

export async function zibalRequest(amountRial: number, callbackUrl: string, description = "") {
  const res = await fetch(`${BASE}/v1/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant: ZIBAL_MERCHANT,
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
    body: JSON.stringify({ merchant: ZIBAL_MERCHANT, trackId }),
  });
  const data = await res.json();
  return {
    ok: data.result === 100,
    result: data.result,
    message: data.message,
    refNumber: data.refNumber,
    amount: data.amount,
  };
}
