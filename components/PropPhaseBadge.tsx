import { propBadgeText } from "@/lib/propChallengeLabels";
import type { PropChallengeBadge } from "@/lib/propChallenge";

// نشان کوچک فاز چالش کنار نام حساب پراپ (فهرست حساب‌ها و صفحه‌ی حساب)
export function PropPhaseBadge({ badge }: { badge: PropChallengeBadge }) {
  return <span className={`pc-badge pc-${badge.status.toLowerCase()}`}>{propBadgeText(badge)}</span>;
}
