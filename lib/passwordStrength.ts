// اندازه‌گیری واقعی قدرت رمز به‌جای شمارش ساده نوع کاراکتر — zxcvbn (متن‌باز
// Dropbox) الگوهای واقعی مهاجم‌ها رو می‌سنجه: کلمات رایج، تاریخ، الگوی صفحه‌کلید،
// تکرار و جایگزینی حروف با عدد (leet speak)، نه فقط «آیا عدد داره یا نه».
// امتیاز خروجیش ۰ تا ۴ هست که این‌جا به ۴ سطح فارسی نگاشت می‌شه.
//
// import پویا عمداست: دیکشنری داخلی zxcvbn حجیمه (چند صد کیلوبایت) و اگه
// مستقیم import بشه، دقیقاً روی صفحه‌ی ثبت‌نام/فراموشی‌رمز (جایی که سرعت لود
// بیشترین اهمیت رو داره) به باندل کلاینت اضافه می‌شه؛ import پویا فقط وقتی
// واقعاً لازمه (کاربر رمز تایپ کرد) بارگذاریش می‌کنه.
export type PasswordTier = "weak" | "medium" | "good" | "strong";

export const PASSWORD_TIER_LABELS: Record<PasswordTier, string> = {
  weak: "ضعیف",
  medium: "متوسط",
  good: "خوب",
  strong: "قوی",
};

export const PASSWORD_TIER_ORDER: PasswordTier[] = ["weak", "medium", "good", "strong"];

let zxcvbnPromise: Promise<(password: string, userInputs?: string[]) => { score: number }> | null = null;
function loadZxcvbn() {
  if (!zxcvbnPromise) zxcvbnPromise = import("zxcvbn").then((m) => m.default as any);
  return zxcvbnPromise;
}

export async function passwordTier(password: string, userInputs: string[] = []): Promise<PasswordTier> {
  if (!password) return "weak";
  const zxcvbn = await loadZxcvbn();
  const { score } = zxcvbn(password, userInputs.filter(Boolean));
  if (score >= 4) return "strong";
  if (score === 3) return "good";
  if (score === 2) return "medium";
  return "weak";
}

// فقط «خوب» و «قوی» برای ساخت حساب قبول می‌شن — «ضعیف»/«متوسط» خطا می‌گیرن
export function isPasswordAcceptable(tier: PasswordTier): boolean {
  return tier === "good" || tier === "strong";
}

export function passwordTierError(tier: PasswordTier): string | null {
  if (isPasswordAcceptable(tier)) return null;
  if (tier === "weak") return "رمز عبور خیلی ضعیفه — یه رمز طولانی‌تر و غیرقابل‌حدس‌تر انتخاب کن";
  return "رمز عبور در حد متوسطه — برای ادامه باید حداقل در سطح «خوب» باشه";
}
