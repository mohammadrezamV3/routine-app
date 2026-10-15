import { tr } from "@/lib/i18n";
import type { PasswordTier } from "@/lib/passwordStrength";

/** برچسب قدرت رمز به زبان جاری (جدول سطح ماژول PASSWORD_TIER_LABELS فارسی ثابته) */
export function passwordTierLabel(t: PasswordTier): string {
  switch (t) {
    case "weak": return tr("ضعیف", "Weak");
    case "medium": return tr("متوسط", "Medium");
    case "good": return tr("خوب", "Good");
    default: return tr("قوی", "Strong");
  }
}
