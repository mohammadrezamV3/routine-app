// اتصال متاتریدر — منطق مشترک کد/توکن و نرمال‌سازی معاملات ورودی.
//
// مدل امنیتی (خلاصه، تا کسی موقع تغییر ندانسته نشکندش):
//   ۱) رمز حساب معاملاتی هیچ‌وقت از کاربر خواسته و هیچ‌جا ذخیره نمی‌شود.
//      ارتباط یک‌طرفه است: EA فقط داده می‌فرستد، Arion هیچ دستوری برنمی‌گرداند.
//   ۲) کاربر در Arion یک «کد اتصال» می‌گیرد (یک‌بارمصرف، ۱۵ دقیقه‌ای) و
//      همان را در تنظیمات EA می‌گذارد. EA یک‌بار آن را می‌فرستد و در عوض
//      یک توکن دائمی می‌گیرد؛ از آن به بعد فقط توکن رد و بدل می‌شود.
//   ۳) نه کد و نه توکن خام ذخیره نمی‌شوند — فقط SHA-256. چون هر دو رشته‌ی
//      تصادفی پرآنتروپی‌اند (نه رمز انتخابی انسان)، هش سریع درست است:
//      حمله‌ی دیکشنری روی ۱۶۰ بیت آنتروپی بی‌معناست، و برخلاف bcrypt
//      اجازه‌ی جست‌وجوی مستقیم با ایندکس را هم می‌دهد.
//   ۴) توکن هر لحظه از پنل قابل ابطال است و ابطال فوری اثر می‌کند (چون
//      هر درخواست مستقیم به دیتابیس می‌خورد، نه به یک JWT امضاشده).

import { createHash, randomBytes } from "crypto";

export type MtPlatform = "MT4" | "MT5";

/** بدون حروف/ارقام شبیه‌به‌هم (0/O، 1/I) — کاربر باید این را دستی تایپ کند */
const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PAIRING_LENGTH = 12;
export const PAIRING_TTL_MS = 15 * 60_000;

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** کد اتصال: ۱۲ کاراکتر از الفبای ۳۲تایی ≈ ۶۰ بیت آنتروپی */
export function generatePairingCode(): string {
  const bytes = randomBytes(PAIRING_LENGTH);
  let out = "";
  for (let i = 0; i < PAIRING_LENGTH; i++) out += PAIRING_ALPHABET[bytes[i] % PAIRING_ALPHABET.length];
  return out.replace(/(.{4})(?=.)/g, "$1-"); // ABCD-EFGH-JKLM
}

export function normalizePairingCode(raw: string): string {
  return String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/(.{4})(?=.)/g, "$1-");
}

/** توکن دائمی EA — ۳۲ بایت تصادفی (۲۵۶ بیت) */
export function generateEaToken(): string {
  return randomBytes(32).toString("base64url");
}

export function tokenPrefixOf(token: string): string {
  return token.slice(0, 8);
}

// ── نرمال‌سازی معاملات ارسالی EA ────────────────────────────────────────

export type MtTradeInput = {
  externalId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  volume: number;
  openPrice: number | null;
  closePrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  profit: number;
  commission: number | null;
  swap: number | null;
  openTime: Date;
  closeTime: Date | null;
  closed: boolean;
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseTime(v: unknown): Date | null {
  if (typeof v === "number") {
    // ثانیه‌ی یونیکس (چیزی که MQL می‌دهد) — نه میلی‌ثانیه
    const d = new Date(v * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const SYMBOL_RE = /^[A-Z0-9][A-Z0-9._#-]{0,19}$/;

/**
 * ردیف‌های خام EA را به شکل داخلی تبدیل می‌کند.
 * ردیف بدشکل بی‌صدا کنار گذاشته می‌شود، نه اینکه کل sync را بشکند — یک
 * نماد عجیب بروکر نباید باعث شود بقیه‌ی معاملات هم ثبت نشوند.
 */
export function normalizeMtTrades(raw: unknown): MtTradeInput[] {
  if (!Array.isArray(raw)) return [];
  const out: MtTradeInput[] = [];
  for (const item of raw.slice(0, 500)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;

    const externalId = String(r.ticket ?? r.id ?? r.externalId ?? "").trim();
    if (!externalId) continue;

    const symbol = String(r.symbol ?? "").trim().toUpperCase().slice(0, 20);
    if (!SYMBOL_RE.test(symbol)) continue;

    const typeRaw = String(r.type ?? r.direction ?? "").toUpperCase();
    // MQL هم رشته می‌دهد هم عدد نوع سفارش (۰ = buy، ۱ = sell)
    const direction: "BUY" | "SELL" =
      typeRaw.includes("SELL") || typeRaw === "1" ? "SELL" : "BUY";

    const volume = num(r.volume ?? r.lots);
    if (!volume || volume <= 0) continue;

    const openTime = parseTime(r.openTime ?? r.open_time);
    if (!openTime) continue;

    const closeTime = parseTime(r.closeTime ?? r.close_time);
    const closed = r.closed === true || (!!closeTime && num(r.closePrice ?? r.close_price) !== null);

    out.push({
      externalId: externalId.slice(0, 40),
      symbol,
      direction,
      volume,
      openPrice: num(r.openPrice ?? r.open_price),
      closePrice: num(r.closePrice ?? r.close_price),
      stopLoss: num(r.stopLoss ?? r.sl),
      takeProfit: num(r.takeProfit ?? r.tp),
      profit: num(r.profit) ?? 0,
      commission: num(r.commission),
      swap: num(r.swap),
      openTime,
      closeTime: closed ? closeTime : null,
      closed,
    });
  }
  return out;
}
