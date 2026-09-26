// پارسِ متنِ راهنمای رودمپ (plan.guide) به بلوک‌های نمایشی — پورتِ مستقیمِ
// همون تابع در app/roadmaps/custom/[id]/page.tsx (وب). عمداً پارسرِ مارک‌داونِ
// کامل نیست: تیتر (##)، بند و آیتمِ فهرست (- * • یا ۱. ۱)) — همه متنِ ساده،
// `**` حذف می‌شه و هیچ HTMLی از خروجیِ مدل اجرا نمی‌شه.
export type GuideBlock = { kind: "h" | "li" | "p"; text: string };

export function parseGuide(guide: string): GuideBlock[] {
  const out: GuideBlock[] = [];
  for (const rawLine of guide.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      out.push({ kind: "h", text: line.replace(/^#+\s*/, "").replace(/\*\*/g, "") });
    } else if (/^([-*•]|\d+[.)])\s+/.test(line)) {
      out.push({ kind: "li", text: line.replace(/^([-*•]|\d+[.)])\s+/, "").replace(/\*\*/g, "") });
    } else {
      out.push({ kind: "p", text: line.replace(/\*\*/g, "") });
    }
  }
  return out;
}
