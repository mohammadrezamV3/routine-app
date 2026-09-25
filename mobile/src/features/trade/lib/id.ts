// شناسه‌ی سمت کلاینت — با 'm' شروع می‌شود تا از cuid سمت سرور (که با 'c'
// شروع می‌شود) قابل‌تشخیص باشد، ولی همان قواعد را رعایت می‌کند: فقط حروف
// کوچک/رقم، حداقل ۲۵ کاراکتر. سرور موقع sync این آیدی را عینا نگه می‌دارد
// (کلاینت تولیدش کرده)، پس دوباره در جدول‌های دیگر هم قابل‌ارجاع است.
export function newId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : fallbackUuid();
  return "m" + uuid.replace(/-/g, "").toLowerCase();
}

function fallbackUuid(): string {
  let s = "";
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

export function nowIso(): string {
  return new Date().toISOString();
}
