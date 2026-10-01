import { describe, it, expect } from "vitest";
import {
  DEFAULT_PRICING_CONFIG, PricingConfig, ROUTINE_MONTHLY_TOKEN, chargeAmountRial, discountPercentOf, durationLabel,
  enabledDurations, entryOffer, fillPriceCopy, findPlanPricing, formatTomanShort, monthlyPriceToman,
  normalizePricingConfig, priceFromDiscount, routineMonthlyCopyFa, validatePricingConfig,
} from "@/lib/planPricing";
import { signCheckoutParams, verifyCheckoutSignature } from "@/lib/checkoutSignature";

const clone = (): PricingConfig => JSON.parse(JSON.stringify(DEFAULT_PRICING_CONFIG));

describe("validatePricingConfig", () => {
  it("پیش‌فرض کد معتبره و کپی تمیز برمی‌گردونه", () => {
    const v = validatePricingConfig(clone());
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.config).toEqual(DEFAULT_PRICING_CONFIG);
  });

  it("فیلدهای ناشناخته دور ریخته می‌شن", () => {
    const c: any = clone();
    c.extra = 1;
    c.plans.basic["1"].hack = true;
    const v = validatePricingConfig(c);
    expect(v.ok && (v.config as any).extra).toBeFalsy();
    expect(v.ok && (v.config.plans.basic["1"] as any).hack).toBeFalsy();
  });

  it("قیمت غیرصحیح، منفی، صفر یا خیلی بزرگ رد می‌شه", () => {
    for (const bad of [0, -1000, 99.5, 999, 2_000_000_000, "99000", null]) {
      const c: any = clone();
      c.plans.trade["3"].price = bad;
      expect(validatePricingConfig(c).ok).toBe(false);
    }
  });

  it("قیمت خط‌خورده کمتر از قیمت نهایی رد می‌شه، 0 یعنی بدون تخفیف", () => {
    const c = clone();
    c.plans.max["6"].original = c.plans.max["6"].price - 1000;
    expect(validatePricingConfig(c).ok).toBe(false);
    c.plans.max["6"].original = 0;
    expect(validatePricingConfig(c).ok).toBe(true);
  });

  it("ماه خارج از بازه، ماه تکراری و خاموش‌کردن همه‌ی مدت‌ها رد می‌شه", () => {
    const a = clone(); a.durations["3"].months = 0;
    expect(validatePricingConfig(a).ok).toBe(false);
    const b = clone(); b.durations["3"].months = 37;
    expect(validatePricingConfig(b).ok).toBe(false);
    const c = clone(); c.durations["6"].months = 3;
    expect(validatePricingConfig(c).ok).toBe(false);
    const d = clone(); for (const k of ["1", "3", "6", "12"] as const) d.durations[k].enabled = false;
    expect(validatePricingConfig(d).ok).toBe(false);
  });

  it("ورودی ناقص رد می‌شه", () => {
    expect(validatePricingConfig(null).ok).toBe(false);
    expect(validatePricingConfig({ durations: clone().durations }).ok).toBe(false);
    const c: any = clone(); delete c.plans.exercise;
    expect(validatePricingConfig(c).ok).toBe(false);
  });
});

describe("normalizePricingConfig", () => {
  it("بدون مقدار ذخیره‌شده یا مقدار خراب → پیش‌فرض کد (نه ترکیب تکه‌ای)", () => {
    expect(normalizePricingConfig(null)).toEqual(DEFAULT_PRICING_CONFIG);
    const c: any = clone(); c.plans.basic["1"].price = -5; c.plans.trade["1"].price = 200_000;
    expect(normalizePricingConfig(c)).toEqual(DEFAULT_PRICING_CONFIG);
  });

  it("مقدار ذخیره‌شده‌ی معتبر همون‌طور برمی‌گرده", () => {
    const c = clone(); c.plans.trade["1"].price = 200_000;
    expect(normalizePricingConfig(c).plans.trade["1"].price).toBe(200_000);
  });
});

describe("resolve helpers", () => {
  it("مبلغ ریالی از پیکربندی، و مدت خاموش قابل خرید نیست", () => {
    const c = clone();
    c.plans.exercise["3"].price = 400_000;
    c.durations["6"].enabled = false;
    expect(findPlanPricing("exercise", c)?.amounts["3"]).toBe(4_000_000);
    expect(chargeAmountRial(c, "exercise", "3")).toBe(4_000_000);
    expect(chargeAmountRial(c, "exercise", "6")).toBeNull();
    expect(chargeAmountRial(c, "nope", "1")).toBeNull();
    expect(chargeAmountRial(c, "exercise", "2")).toBeNull();
    expect(enabledDurations(c)).toEqual(["1", "3", "12"]);
  });

  it("پیش‌فرض بدون پیکربندی همون مبلغ‌های قبلیه", () => {
    expect(findPlanPricing("basic")?.amounts).toEqual({ "1": 990_000, "3": 2_600_000, "6": 5_200_000, "12": 10_400_000 });
  });

  it("تعداد ماه هر جایگاه از پیکربندیه", () => {
    const c = clone(); c.durations["3"].months = 2;
    expect(durationLabel(c, "3")).toBe("2 ماهه");
  });

  it("درصد تخفیف و قیمت از درصد", () => {
    expect(discountPercentOf({ price: 260_000, original: 297_000 })).toBe(12.5);
    expect(discountPercentOf({ price: 99_000, original: 0 })).toBe(0);
    expect(priceFromDiscount(300_000, 20)).toBe(240_000);
    expect(priceFromDiscount(297_000, 12.5)).toBe(260_000);
  });

  it("پیشنهاد شروع: یک‌ماهه اگه فعاله، وگرنه اولین مدت فعال", () => {
    const c = clone();
    expect(entryOffer(c, "basic")).toMatchObject({ duration: "1", months: 1, price: 99_000, label: "ماهانه 99,000 تومان" });
    c.durations["1"].enabled = false;
    expect(entryOffer(c, "basic")).toMatchObject({ duration: "3", months: 3, label: "3 ماهه 260,000 تومان" });
  });

  it("قیمت ماهانه‌ی متن‌ها", () => {
    const c = clone(); c.plans.basic["1"].price = 120_000;
    expect(monthlyPriceToman(c, "basic")).toBe(120_000);
    expect(routineMonthlyCopyFa(c)).toBe("ماهانه 120 هزار تومان");
    expect(formatTomanShort(1_250_000)).toBe("1,250 هزار تومان");
    expect(formatTomanShort(99_500)).toBe("99,500 تومان");
  });

  it("fillPriceCopy همه‌ی نشانه‌ها رو در رشته/آرایه/آبجکت پر می‌کنه", () => {
    const c = clone(); c.plans.basic["1"].price = 150_000;
    const out = fillPriceCopy([{ q: "x", a: `پلن (${ROUTINE_MONTHLY_TOKEN}) و ${ROUTINE_MONTHLY_TOKEN}` }], c);
    expect(out[0].a).toBe("پلن (ماهانه 150 هزار تومان) و ماهانه 150 هزار تومان");
    expect(fillPriceCopy(`(${ROUTINE_MONTHLY_TOKEN})`, DEFAULT_PRICING_CONFIG)).toBe("(ماهانه 99 هزار تومان)");
  });
});

describe("checkoutSignature", () => {
  const base = { userId: "u1", planKey: "basic", duration: "1", months: 1, amount: 990_000, discountPercent: 0 };

  it("امضای درست تایید می‌شه", () => {
    expect(verifyCheckoutSignature(base, signCheckoutParams(base))).toBe(true);
  });

  it("دستکاری پلن، مدت، ماه، مبلغ، تخفیف یا کاربر رد می‌شه", () => {
    const sig = signCheckoutParams(base);
    expect(verifyCheckoutSignature({ ...base, planKey: "max" }, sig)).toBe(false);
    expect(verifyCheckoutSignature({ ...base, duration: "12" }, sig)).toBe(false);
    expect(verifyCheckoutSignature({ ...base, months: 12 }, sig)).toBe(false);
    expect(verifyCheckoutSignature({ ...base, amount: 1 }, sig)).toBe(false);
    expect(verifyCheckoutSignature({ ...base, discountPercent: 50 }, sig)).toBe(false);
    expect(verifyCheckoutSignature({ ...base, userId: "u2" }, sig)).toBe(false);
    expect(verifyCheckoutSignature({ ...base, upgradeFromSubId: "s1" }, sig)).toBe(false);
  });

  it("امضای خالی یا خراب رد می‌شه", () => {
    expect(verifyCheckoutSignature(base, null)).toBe(false);
    expect(verifyCheckoutSignature(base, "")).toBe(false);
    expect(verifyCheckoutSignature(base, "abc")).toBe(false);
  });
});
