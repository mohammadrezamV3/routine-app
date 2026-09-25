// منطقِ خالص (بدونِ React/Capacitor) ِ فیچرِ حساب — قابلِ تست.
import { formatJalali, toJalali } from "@/lib/jalali";
import type {
  MobileBillingDuration,
  MobileBillingPrice,
  MobileCheckoutStatusResponse,
  MobileTicketStatus,
} from "@/lib/account-contract";

export const DURATION_LABELS: Record<MobileBillingDuration, string> = {
  "1": "یک ماهه",
  "3": "سه ماهه",
  "6": "شش ماهه",
  "12": "یک ساله",
};

export const MODULE_LABELS: Record<string, string> = {
  ROUTINE: "روتین",
  SLEEP: "خواب",
  TASKS: "کارها",
  EXERCISE: "بدنسازی",
  CALORIE: "کالری",
  TRADE: "ترید",
  ROADMAP: "رودمپ",
  AI_INSIGHT: "تحلیلِ هوشمند",
};

export const TICKET_STATUS_LABELS: Record<MobileTicketStatus, string> = {
  OPEN: "در انتظارِ پاسخ",
  ANSWERED: "پاسخ داده شد",
  CLOSED: "بسته",
};

/** ریال → «۱۵۰٬۰۰۰ تومان» (همون قاعده‌ی lib/formatPrice.ts ِ وب: ÷۱۰) */
export function formatToman(rial: number): string {
  return `${Math.round(rial / 10).toLocaleString("en-US")} تومان`;
}

/** همون ترتیبِ چک‌اوتِ وب: اول اعتبارِ ارتقا، بعد درصدِ تخفیف — فقط برای پیش‌نمایش */
export function effectiveAmount(price: MobileBillingPrice, discountPercent: number): number {
  const base = price.upgradeAmount ?? price.amount;
  return discountPercent > 0 ? Math.round((base * (100 - discountPercent)) / 100) : base;
}

export function formatIsoJalali(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatJalali(toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()));
}

export function badgeLabel(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 9 ? "9+" : String(Math.floor(count));
}

// ─── checkout ِ در جریان — برای برگشت بعد از کشته‌شدنِ اپ توسطِ سیستم ────

const PENDING_KEY = "arion:account:pendingCheckout";
/** بیشتر از این قدیمی باشه دیگه دنبالش نمی‌ریم (همون پنجره‌ی ۲ ساعته‌ی سرور) */
const PENDING_MAX_AGE_MS = 2 * 60 * 60 * 1000;

type PendingCheckout = { id: string; at: number };

export function savePendingCheckout(id: string, now = Date.now()): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ id, at: now } satisfies PendingCheckout));
  } catch {
    /* ذخیره‌سازی در دسترس نیست — فقط بازیابی بعد از kill از دست می‌ره */
  }
}

export function loadPendingCheckout(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<PendingCheckout>;
    if (typeof v.id !== "string" || typeof v.at !== "number" || now - v.at > PENDING_MAX_AGE_MS) return null;
    return v.id;
  } catch {
    return null;
  }
}

export function clearPendingCheckout(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* بی‌اهمیت */
  }
}

// ─── poll ِ وضعیت ───────────────────────────────────────────────────────

export type PollOptions = {
  intervalMs?: number;
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
  onUpdate?: (s: MobileCheckoutStatusResponse) => void;
  isCancelled?: () => boolean;
};

/**
 * وضعیت رو تا رسیدن به حالتِ نهایی (PAID/EXPIRED) یا تمومِ دفعات می‌پرسه.
 * برگشت از درگاه ممکنه چند ثانیه قبل از ثبتِ verify باشه، پس یک‌بار پرسیدن کافی نیست.
 * خطای شبکه = یک دفعه‌ی ناموفق، نه پایان.
 */
export async function pollCheckoutStatus(
  fetchStatus: () => Promise<MobileCheckoutStatusResponse>,
  opts: PollOptions = {}
): Promise<MobileCheckoutStatusResponse | null> {
  const interval = opts.intervalMs ?? 2500;
  const max = opts.maxAttempts ?? 8;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let last: MobileCheckoutStatusResponse | null = null;
  for (let i = 0; i < max; i++) {
    if (opts.isCancelled?.()) return last;
    try {
      last = await fetchStatus();
      opts.onUpdate?.(last);
      if (last.final) return last;
    } catch (err) {
      // ۴۰۴/۴۰۱ هیچ‌وقت خوب نمی‌شن
      const status = (err as { status?: number })?.status;
      if (status === 404 || status === 401) throw err;
    }
    if (i < max - 1) await sleep(interval);
  }
  return last;
}
