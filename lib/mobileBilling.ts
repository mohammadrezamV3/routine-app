import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { DURATIONS, findPlanPricing, type Duration } from "@/lib/planPricing";
import { resolveDiscountCode } from "@/lib/discountValidation";
import { findUpgradeSource, computeUpgradePricing, UPGRADE_TARGET_PLAN_KEY } from "@/lib/planUpgrade";
import type {
  MobileBillingDuration,
  MobileBillingPlan,
  MobileBillingPlansResponse,
  MobileBillingProviderKey,
  MobileCheckoutResponse,
  MobileCheckoutStatus,
  MobileCheckoutStatusResponse,
} from "@/lib/mobileAccountContract";

// خریدِ پلن از اپ موبایل — «دست‌به‌دست» به وب.
//
// اصلِ امنیتی: اپ هیچ‌وقت پرداخت نمی‌کنه و هیچ‌وقت موفقیتِ پرداخت رو اعلام
// نمی‌کنه. تنها جایی که Subscription/Payment/ModuleAccess ساخته می‌شه همون
// /api/subscription/verify ِ وبه (بعد از verify ِ زیبال و تطبیقِ مبلغ). این
// فایل فقط:
//   1. قصدِ خرید رو (پلن/مدت/کد) اعتبارسنجی و یک ردیفِ MobileCheckout ِ
//      PENDING می‌سازه، با توکنِ تصادفیِ ۳۲ بایتی که فقط SHA-256ش ذخیره می‌شه،
//      عمرش ≤ ۱۰ دقیقه‌ست و فقط یک‌بار مصرف می‌شه (updateMany ِ اتمیک).
//   2. موقعِ مصرفِ توکن (GET /api/mobile/billing/handoff در مرورگرِ سیستم)
//      ردیف رو OPENED می‌کنه — ساختِ نشستِ کوتاه‌عمرِ وب در
//      lib/mobileBillingWebSession.ts.
//   3. وضعیت رو فقط از روی جدولِ Payment (paidAt پر = verify‌شده) ِ خودِ
//      همون کاربر استنتاج می‌کنه — نه از هیچ پارامترِ کلاینت.

export const CHECKOUT_TOKEN_TTL_MS = 10 * 60 * 1000;
/** بعد از باز شدنِ آدرس، تا کی منتظرِ پرداخت بمونیم تا EXPIRED بشه */
export const CHECKOUT_PAYMENT_WINDOW_MS = 2 * 60 * 60 * 1000;
/** ردیف‌های قدیمی‌تر از این پاک می‌شن */
const CHECKOUT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const DURATION_MONTHS: Record<Duration, number> = { "1": 1, "3": 3, "6": 6, "12": 12 };

// ─── BillingProvider ──────────────────────────────────────────────────────
//
// کافه‌بازار/گوگل‌پلی برای «کالای دیجیتال» ممکنه پرداختِ درون‌برنامه‌ای
// خودشون (Poolakey / Play Billing) رو اجباری کنن. برای همین جریانِ خرید پشتِ
// این اینترفیس نشسته: ارائه‌دهنده‌ی فعلی «web» (زیبال روی سایت) است؛
// ارائه‌دهنده‌ی فروشگاهی بعدا باید verify ِ رسید رو **سمتِ سرور** با API ِ
// خودِ فروشگاه انجام بده و ماژول رو از همون مسیرِ واحدِ اعطا بده — هیچ‌وقت
// از روی ادعای اپ. mobile/README-billing.md را ببین.

export type BillingBeginInput = { userId: string; planKey: string; duration: MobileBillingDuration; discountCode: string | null; quotedAmount: number; siteUrl: string };
export type BillingBeginResult = { checkoutId: string; checkoutUrl: string; expiresAt: Date };

export interface BillingProvider {
  key: MobileBillingProviderKey;
  /** آیا روی این سرور پیکربندی شده؟ */
  isAvailable(): boolean;
  begin(input: BillingBeginInput): Promise<BillingBeginResult>;
}

export function hashCheckoutToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newCheckoutToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isWellFormedCheckoutToken(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{43}$/.test(v);
}

export const webBillingProvider: BillingProvider = {
  key: "web",
  isAvailable: () => !!process.env.ZIBAL_MERCHANT_KEY,
  async begin(input) {
    const token = newCheckoutToken();
    const expiresAt = new Date(Date.now() + CHECKOUT_TOKEN_TTL_MS);
    const row = await prisma.mobileCheckout.create({
      data: {
        userId: input.userId,
        planKey: input.planKey,
        duration: input.duration,
        discountCode: input.discountCode,
        quotedAmount: input.quotedAmount,
        provider: "web",
        status: "PENDING",
        tokenHash: hashCheckoutToken(token),
        tokenExpiresAt: expiresAt,
      },
      select: { id: true },
    });
    // توکن فقط همین‌جا و فقط داخلِ همین آدرس وجود داره — هیچ‌جا لاگ/ذخیره نمی‌شه
    const checkoutUrl = `${input.siteUrl}/api/mobile/billing/handoff?t=${token}`;
    return { checkoutId: row.id, checkoutUrl, expiresAt };
  },
};

export function getBillingProvider(): BillingProvider {
  return webBillingProvider;
}

// ─── فهرستِ پلن‌ها ────────────────────────────────────────────────────────

export async function listBillingPlans(userId: string): Promise<MobileBillingPlansResponse> {
  const [plans, sub, upgradeSource] = await Promise.all([
    prisma.plan.findMany({
      where: { market: "IRAN", isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { key: true, nameFa: true, modules: { select: { module: true } } },
    }),
    prisma.subscription.findFirst({
      where: { userId, status: { in: ["ACTIVE", "TRIAL"] }, currentPeriodEnd: { gt: new Date() } },
      orderBy: { currentPeriodEnd: "desc" },
      select: { status: true, currentPeriodEnd: true, plan: { select: { key: true, nameFa: true } } },
    }),
    findUpgradeSource(userId),
  ]);

  const out: MobileBillingPlan[] = plans.map((p) => {
    const pricing = findPlanPricing(p.key);
    const free = !pricing || !!pricing.free || !pricing.amounts;
    const prices = free
      ? []
      : DURATIONS.map((d) => {
          const amount = pricing!.amounts![d];
          let upgradeAmount: number | null = null;
          let upgradeCapEnd: string | null = null;
          if (p.key === UPGRADE_TARGET_PLAN_KEY && upgradeSource) {
            const u = computeUpgradePricing(amount, upgradeSource, DURATION_MONTHS[d]);
            upgradeAmount = u.amount;
            upgradeCapEnd = u.capped ? u.periodEnd.toISOString() : null;
          }
          return { duration: d, amount, upgradeAmount, upgradeCapEnd };
        });
    return { key: p.key, name: p.nameFa, modules: p.modules.map((m) => m.module), free, prices, current: sub?.plan.key === p.key };
  });

  const provider = getBillingProvider();
  return {
    plans: out,
    subscription: sub
      ? { planKey: sub.plan.key, planName: sub.plan.nameFa, status: sub.status === "TRIAL" ? "TRIAL" : "ACTIVE", expiresAt: sub.currentPeriodEnd.toISOString() }
      : null,
    provider: provider.key,
    checkoutAvailable: provider.isAvailable(),
  };
}

// ─── ساختِ checkout ───────────────────────────────────────────────────────

export type CreateCheckoutResult = { ok: true; body: MobileCheckoutResponse } | { ok: false; status: number; error: string };

export function isBillingDuration(v: unknown): v is MobileBillingDuration {
  return typeof v === "string" && (DURATIONS as string[]).includes(v);
}

/** همون محاسبه‌ی مبلغِ چک‌اوتِ وب (اعتبارِ ارتقا → بعد درصدِ تخفیف) — فقط برای پیش‌نمایش */
async function quoteAmount(userId: string, planKey: string, duration: Duration, discountPercent: number): Promise<number | null> {
  const pricing = findPlanPricing(planKey);
  if (!pricing || pricing.free || !pricing.amounts) return null;
  let base = pricing.amounts[duration];
  if (planKey === UPGRADE_TARGET_PLAN_KEY) {
    const src = await findUpgradeSource(userId);
    if (src) base = computeUpgradePricing(base, src, DURATION_MONTHS[duration]).amount;
  }
  return discountPercent > 0 ? Math.round((base * (100 - discountPercent)) / 100) : base;
}

export async function createMobileCheckout(
  userId: string,
  input: { planKey: unknown; duration: unknown; discountCode?: unknown },
  siteUrl: string
): Promise<CreateCheckoutResult> {
  const provider = getBillingProvider();
  if (!provider.isAvailable()) return { ok: false, status: 503, error: "درگاه پرداخت هنوز روی این سرور راه‌اندازی نشده — به‌زودی" };

  const planKey = typeof input.planKey === "string" ? input.planKey.trim().slice(0, 32) : "";
  if (!planKey || !isBillingDuration(input.duration)) return { ok: false, status: 400, error: "پلن یا مدت انتخاب‌شده معتبر نیست" };
  const duration = input.duration;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true, isBlocked: true, deletedAt: true } });
  if (!user || user.isBlocked || user.deletedAt) return { ok: false, status: 401, error: "unauthorized" };
  // سوپریوزر همیشه همه‌ی ماژول‌ها رو داره — خرید براش بی‌معنیه و نشستِ وبِ
  // سوپریوزر رو هم بی‌دلیل توی مرورگر باز نمی‌کنیم.
  if (user.isSuperAdmin) return { ok: false, status: 400, error: "حسابِ مدیر به خرید پلن نیاز ندارد" };

  const pricing = findPlanPricing(planKey);
  if (!pricing || pricing.free || !pricing.amounts) return { ok: false, status: 400, error: "این پلن قابل خرید نیست" };
  const plan = await prisma.plan.findUnique({ where: { key_market: { key: planKey, market: "IRAN" } }, select: { isActive: true } });
  if (!plan || !plan.isActive) return { ok: false, status: 400, error: "این پلن فعلا در دسترس نیست" };

  // کد: همون resolveDiscountCode ِ وب، بدونِ عارضه (ReferralUsage/DiscountCodeUsage
  // فقط در چک‌اوت/verify ِ وب ساخته می‌شن).
  let discountPercent = 0;
  let discountCode: string | null = null;
  const rawCode = typeof input.discountCode === "string" ? input.discountCode.trim().slice(0, 40) : "";
  if (rawCode) {
    const r = await resolveDiscountCode(rawCode, userId, planKey);
    if (!r.ok) return { ok: false, status: 400, error: r.error };
    discountPercent = r.percent;
    discountCode = rawCode.toUpperCase();
  }

  const quotedAmount = await quoteAmount(userId, planKey, duration, discountPercent);
  if (quotedAmount == null) return { ok: false, status: 400, error: "این پلن قابل خرید نیست" };

  cleanupOldCheckouts().catch(() => {});
  const begun = await provider.begin({ userId, planKey, duration, discountCode, quotedAmount, siteUrl });
  return {
    ok: true,
    body: {
      checkoutId: begun.checkoutId,
      checkoutUrl: begun.checkoutUrl,
      expiresAt: begun.expiresAt.toISOString(),
      quotedAmount,
      discountPercent,
      discountCode,
    },
  };
}

async function cleanupOldCheckouts() {
  await prisma.mobileCheckout.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - CHECKOUT_RETENTION_MS) } } });
}

// ─── مصرفِ توکن (handoff) ─────────────────────────────────────────────────

export type RedeemedCheckout = { id: string; userId: string; planKey: string; duration: MobileBillingDuration };

/**
 * یک‌بارمصرف و اتمیک: updateMany با شرطِ «هنوز مصرف‌نشده و منقضی‌نشده».
 * دو درخواستِ هم‌زمان با یک توکن → فقط یکی count=1 می‌گیره.
 */
export async function redeemCheckoutToken(token: unknown, now = new Date()): Promise<RedeemedCheckout | null> {
  if (!isWellFormedCheckoutToken(token)) return null;
  const tokenHash = hashCheckoutToken(token);
  const { count } = await prisma.mobileCheckout.updateMany({
    where: { tokenHash, tokenUsedAt: null, tokenExpiresAt: { gt: now }, status: "PENDING" },
    data: { tokenUsedAt: now, openedAt: now, status: "OPENED" },
  });
  if (count !== 1) return null;
  const row = await prisma.mobileCheckout.findUnique({ where: { tokenHash }, select: { id: true, userId: true, planKey: true, duration: true } });
  if (!row || !isBillingDuration(row.duration)) return null;
  return { id: row.id, userId: row.userId, planKey: row.planKey, duration: row.duration };
}

// ─── وضعیت ────────────────────────────────────────────────────────────────

/**
 * وضعیتِ یک checkout — فقط مالِ همین کاربر (where: {id, userId}؛ غیرِ آن → null = ۴۰۴).
 *
 * PAID فقط وقتی که یک Payment ِ **verify‌شده** (paidAt پر، provider زیبال)
 * روی اشتراکی از **همین کاربر و همین پلن**، بعد از لحظه‌ی باز شدنِ آدرس،
 * وجود داشته باشه و به checkout ِ دیگه‌ای جفت نشده باشه (paymentId یکتا).
 */
export async function getCheckoutStatus(userId: string, checkoutId: string, now = new Date()): Promise<MobileCheckoutStatusResponse | null> {
  if (typeof checkoutId !== "string" || checkoutId.length > 40) return null;
  let row = await prisma.mobileCheckout.findFirst({ where: { id: checkoutId, userId } });
  if (!row) return null;

  if (row.status !== "PAID" && row.openedAt) {
    const claimed = await prisma.mobileCheckout.findMany({ where: { userId, paymentId: { not: null } }, select: { paymentId: true } });
    const payment = await prisma.payment.findFirst({
      where: {
        paidAt: { gte: new Date(row.openedAt.getTime() - 60_000) },
        refundedAt: null,
        provider: "zibal",
        id: { notIn: claimed.map((c) => c.paymentId!) },
        subscription: { userId, plan: { key: row.planKey } },
      },
      orderBy: { paidAt: "asc" },
      select: { id: true },
    });
    if (payment) {
      try {
        await prisma.mobileCheckout.updateMany({
          where: { id: row.id, userId, paymentId: null },
          data: { status: "PAID", paymentId: payment.id, resolvedAt: now },
        });
      } catch {
        // P2002: هم‌زمان به checkout ِ دیگه‌ای جفت شد — دفعه‌ی بعد دوباره می‌گردیم
      }
      row = (await prisma.mobileCheckout.findFirst({ where: { id: checkoutId, userId } }))!;
    }
  }

  let status = row.status as MobileCheckoutStatus;
  if (status === "PENDING" && row.tokenExpiresAt <= now) status = "EXPIRED";
  if (status === "OPENED" && row.openedAt && row.openedAt.getTime() + CHECKOUT_PAYMENT_WINDOW_MS <= now.getTime()) status = "EXPIRED";
  if (status !== row.status && status === "EXPIRED") {
    await prisma.mobileCheckout.updateMany({ where: { id: row.id, userId, status: row.status }, data: { status, resolvedAt: now } });
  }

  let paidAt: string | null = null;
  let subscriptionExpiresAt: string | null = null;
  if (status === "PAID" && row.paymentId) {
    const p = await prisma.payment.findFirst({
      where: { id: row.paymentId, subscription: { userId } },
      select: { paidAt: true, subscription: { select: { currentPeriodEnd: true } } },
    });
    paidAt = p?.paidAt?.toISOString() ?? null;
    subscriptionExpiresAt = p?.subscription.currentPeriodEnd.toISOString() ?? null;
  }

  return {
    checkoutId: row.id,
    status,
    planKey: row.planKey,
    duration: (isBillingDuration(row.duration) ? row.duration : "1") as MobileBillingDuration,
    paidAt,
    subscriptionExpiresAt,
    final: status === "PAID" || status === "EXPIRED",
  };
}

/** برای اطلاعیه‌ها: خریدهای موفقِ اخیرِ اپ */
export async function recentPaidCheckouts(userId: string, since: Date) {
  return prisma.mobileCheckout.findMany({
    where: { userId, status: "PAID", resolvedAt: { gte: since } },
    orderBy: { resolvedAt: "desc" },
    take: 5,
    select: { id: true, planKey: true, resolvedAt: true },
  });
}

