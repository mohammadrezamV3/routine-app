import { faNum } from "./jalali";
import { tr } from "./i18n";
import type { PropChallengeBadge, PropFailReason, PropPresetKey, PropStatus } from "./propChallenge";

// برچسب‌های چالش پراپ. همه توابع‌اند (نه ثابت سطح ماژول) تا زبان درست خوانده بشه.

export const propStatusLabel = (s: PropStatus) =>
  s === "ACTIVE" ? tr("در جریان", "In progress")
  : s === "PASSED" ? tr("قبول شد", "Passed")
  : s === "FAILED" ? tr("شکست خورد", "Failed")
  : tr("فاند شده", "Funded");

export const propPhaseName = (index: number, total: number) =>
  index >= total ? tr("فاند", "Funded") : tr(`فاز ${faNum(index + 1)}`, `Phase ${index + 1}`);

export const propFailText = (r: PropFailReason | null) =>
  r === "DAILY" ? tr("حد ضرر روزانه شکسته شد", "The daily loss limit was breached")
  : r === "OVERALL" ? tr("حد ضرر کلی شکسته شد", "The overall loss limit was breached")
  : r === "TIME" ? tr("مهلت فاز تمام شد", "The phase time limit ran out")
  : "";

export const propPresetLabel = (k: PropPresetKey | "NONE") =>
  k === "NONE" ? tr("بدون چالش", "No challenge")
  : k === "ONE" ? tr("1 مرحله‌ای", "1-step")
  : k === "TWO" ? tr("2 مرحله‌ای", "2-step")
  : k === "THREE" ? tr("3 مرحله‌ای", "3-step")
  : tr("فاند مستقیم", "Instant funded");

/** متن کوتاه نشان فاز در فهرست حساب‌ها */
export function propBadgeText(b: PropChallengeBadge): string {
  if (b.status === "FUNDED") return tr("فاند شده", "Funded");
  const name = propPhaseName(b.currentPhase, b.totalPhases);
  if (b.status === "PASSED") return tr(`${name} قبول شد`, `${name} passed`);
  if (b.status === "FAILED") return tr(`${name} شکست خورد`, `${name} failed`);
  return tr(`${name} از ${faNum(b.totalPhases)}`, `${name} of ${b.totalPhases}`);
}
