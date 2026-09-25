// شناسه‌ی رکوردهای محلی — همون id عینا به سرور push می‌شه، پس باید با
// اعتبارسنجیِ سرور (isValidClientId در lib/mobileSync.ts:
// `^[a-z][a-z0-9]{19,31}$`) جور باشه: پیشوندِ 'm' + ۳۱ کاراکترِ hexِ کوچک
// (بدونِ خط‌تیره) = ۳۲ کاراکتر — هم‌قرارداد با newId در mobile/src/db/db.ts.
export function newLocalId(): string {
  let hex = "";
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    hex = crypto.randomUUID().replace(/-/g, "");
  } else {
    while (hex.length < 32) hex += Math.floor(Math.random() * 16).toString(16);
  }
  return "m" + hex.toLowerCase().slice(0, 31);
}

export function nowIso(): string {
  return new Date().toISOString();
}
