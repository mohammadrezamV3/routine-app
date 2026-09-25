// پارسِ متنِ راهنمای رودمپ (plan.guide) به بلوک‌های نمایشی — پورتِ مستقیمِ
// همون تابع در app/roadmaps/custom/[id]/page.tsx (وب).
export type GuideBlock = { kind: "h" | "li" | "p"; text: string };

export function parseGuide(guide: string): GuideBlock[] {
  const out: GuideBlock[] = [];
  for (const rawLine of guide.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      out.push({ kind: "h", text: line.replace(/^#+\s*/, "") });
    } else if (/^[-*•]\s+/.test(line)) {
      out.push({ kind: "li", text: line.replace(/^[-*•]\s+/, "") });
    } else {
      out.push({ kind: "p", text: line });
    }
  }
  return out;
}
