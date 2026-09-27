import { QA_CATEGORY_LABELS, QACategory, QAItem } from "./types";
import { ROUTINE_QA } from "./routine";
import { TRADING_QA } from "./trading";
import { FITNESS_QA } from "./fitness";

export { QA_CATEGORY_LABELS };
export type { QACategory, QAItem };

// همه‌ی پرسش‌ها — slug تکراری (اگر نویسنده‌ها ناخواسته یکی ساختند) فقط اولین
// بار نگه داشته می‌شود تا دو صفحه با یک آدرس ساخته نشود.
const seen = new Set<string>();
export const ALL_QA: QAItem[] = [...ROUTINE_QA, ...TRADING_QA, ...FITNESS_QA].filter((q) => {
  if (!q?.slug || seen.has(q.slug)) return false;
  seen.add(q.slug);
  return true;
});

const bySlug = new Map(ALL_QA.map((q) => [q.slug, q]));

export function getQA(slug: string): QAItem | undefined {
  return bySlug.get(slug);
}

/** فقط related‌هایی که واقعا وجود دارند — لینکِ شکسته ممنوع */
export function relatedOf(q: QAItem): QAItem[] {
  const own = q.related.map((s) => bySlug.get(s)).filter((x): x is QAItem => !!x && x.slug !== q.slug);
  if (own.length >= 3) return own.slice(0, 4);
  // کم بود؟ از همان دسته پر می‌شود
  const extra = ALL_QA.filter((x) => x.category === q.category && x.slug !== q.slug && !own.includes(x));
  return [...own, ...extra].slice(0, 4);
}

export const QA_CATEGORY_ORDER: QACategory[] = ["routine", "habits", "planning", "sleep", "trading", "trading-psychology", "forex", "fitness", "nutrition"];

export function qaByCategory(): { category: QACategory; label: string; items: QAItem[] }[] {
  return QA_CATEGORY_ORDER.map((c) => ({ category: c, label: QA_CATEGORY_LABELS[c], items: ALL_QA.filter((q) => q.category === c) }))
    .filter((g) => g.items.length > 0);
}

/** متنِ سادهِ کلِ جواب — برای JSON-LD و llms.txt */
export function answerPlainText(q: QAItem): string {
  return [q.short, ...q.answer.map((b) => (typeof b === "string" ? b : "h" in b ? b.h : b.list.map((x) => `- ${x}`).join("\n")))].join("\n\n");
}
