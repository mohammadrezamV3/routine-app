// داشبورد هر بخش (روتین / ورزش / ترید) — منطق خالص و مشترک سرور و کلاینت.
// دامنه‌ی اصلی (section = null) دقیقا مثل قبل همه‌ی کارت‌ها رو داره؛ این فایل فقط
// تصمیم می‌گیره هر بخش کدوم کارت‌ها رو بسازه/نشون بده و چطور بچینه.
// هیچ import سروری یا ری‌اکتی این‌جا نیست.

import { pathAllowedIn, type SectionKey } from "./sections";

export type DashArea = "today" | "heat" | "ex" | "cal" | "space" | "trade" | "market" | "mentor" | "road" | "inbox" | "sleep" | "tools";

export type DashBlocks = {
  /** کارت‌های برنامه‌ی امروز و نقشه‌ی ثبات */
  routine: boolean;
  /** تمرین و کالری */
  fitness: boolean;
  /** عملکرد ترید و تقویم اقتصادی */
  trade: boolean;
  roadmaps: boolean;
  /** خواب فقط در بخش روتین و ورزش هست (دامنه‌ی اصلی همون داشبورد قبلیه) */
  sleep: boolean;
};

/** کدوم بلوک‌ها در این بخش ساخته و نشون داده می‌شن */
export function dashboardBlocks(section: SectionKey | null): DashBlocks {
  return {
    routine: !section || section === "routine",
    fitness: !section || section === "workout",
    trade: !section || section === "trade",
    roadmaps: !section || section === "routine",
    sleep: section === "routine" || section === "workout",
  };
}

/** آیا مقصد (href با query/hash) روی میزبان این بخش باز می‌شه؟ */
export function hrefAllowedIn(section: SectionKey | null, href: string): boolean {
  if (!href.startsWith("/")) return true;
  return pathAllowedIn(section, href.split(/[?#]/)[0]);
}

const q = (row: string[]) => `"${row.join(" ")}"`;

/** یک ردیف با `cols` ستون؛ کارت‌ها جای خالی رو مساوی پر می‌کنن (اولی‌ها یک ستون بیشتر) */
function fitRow(list: string[], cols: number): string[] {
  const k = Math.min(list.length, cols);
  const base = Math.floor(cols / k);
  let extra = cols % k;
  const row: string[] = [];
  for (let i = 0; i < k; i++) {
    const span = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    for (let j = 0; j < span; j++) row.push(list[i]);
  }
  return row;
}

/** کارت‌ها رو در ردیف‌های متوازن می‌چینه (۴ کارت روی ۳ ستون = ۲+۲ نه ۳+۱) */
export function packRows(list: string[], cols: number): string[] {
  if (!list.length) return [];
  const rows = Math.ceil(list.length / cols);
  const base = Math.floor(list.length / rows);
  let extra = list.length % rows;
  const out: string[] = [];
  let at = 0;
  for (let r = 0; r < rows; r++) {
    const size = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    out.push(q(fitRow(list.slice(at, at + size), cols)));
    at += size;
  }
  return out;
}

/** grid-template-areas برای سه عرض، فقط از کارت‌هایی که واقعا هستن */
export function sectionAreas(has: Set<DashArea>, section: SectionKey): { lg: string; md: string; sm: string } {
  const pick = (...a: DashArea[]) => a.filter((x) => has.has(x)) as string[];
  const lg: string[] = [];
  const md: string[] = [];
  let order: DashArea[] = [];

  if (section === "routine") {
    order = ["today", "heat", "sleep", "road", "mentor", "inbox"];
    const head = has.has("today");
    if (head) { lg.push(q(["today", "heat", "heat"])); md.push(q(["heat", "heat"]), q(["today", "today"])); }
    const rest = pick("sleep", "road", "mentor", "inbox");
    lg.push(...packRows(rest, 3));
    md.push(...packRows(rest, 2));
  } else if (section === "workout") {
    // «فضای تمرین» (پنل‌های واقعی تمرین و تغذیه) جای دو کارت خلاصه‌ی ex/cal: ردیف تمام‌عرض اول
    order = ["space", "sleep"];
    if (has.has("space")) { lg.push(q(["space", "space", "space"])); md.push(q(["space", "space"])); }
    const rest = pick("sleep");
    lg.push(...packRows(rest, 3));
    md.push(...packRows(rest, 2));
  } else {
    // ترید: عملکرد و بازار، بعد ابزارها (کارت مربی و اعلان‌ها فقط مال روتینه)
    order = ["trade", "market", "tools"];
    const main = pick("trade", "market");
    if (main.length === 2) { lg.push(q(["trade", "trade", "market"])); md.push(q(["trade", "trade"]), q(["market", "market"])); }
    else if (main.length === 1) { lg.push(q(fitRow(main, 3))); md.push(q(fitRow(main, 2))); }
    // ابزارها: ردیف تمام‌عرض زیر عملکرد و بازار (جای هاب قدیمی /trade)
    if (has.has("tools")) { lg.push(q(["tools", "tools", "tools"])); md.push(q(["tools", "tools"])); }
  }
  const sm = order.filter((a) => has.has(a)).map((a) => q([a]));
  return { lg: lg.join(" "), md: md.join(" "), sm: sm.join(" ") };
}
