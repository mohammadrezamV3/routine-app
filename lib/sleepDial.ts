// هندسه‌ی صفحه‌ی ساعت 24 ساعته‌ی خواب (components/SleepDial.tsx) — خالص و
// تست‌شده. نیمه‌شب بالای صفحه‌ست و زمان ساعتگرد جلو می‌ره؛ هر دقیقه = 0.25 درجه.

/** دقیقه‌ی روز (0..1439) → زاویه به درجه (0 = بالا، ساعتگرد) */
export function minuteToAngle(min: number): number {
  return ((((min % 1440) + 1440) % 1440) / 1440) * 360;
}

/** نقطه‌ی روی دایره برای زاویه‌ی داده‌شده */
export function pointAt(c: number, r: number, angleDeg: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  // گرد کردن تا خروجی SSR و کلاینت بیت‌به‌بیت یکی باشه (بدون هشدار هیدریشن)
  const rd = (n: number) => Math.round(n * 1000) / 1000;
  return { x: rd(c + r * Math.sin(a)), y: rd(c - r * Math.cos(a)) };
}

/** طول قوس ساعتگرد از دقیقه‌ی a تا b (بیرون از نیمه‌شب هم درست می‌چرخه) */
export function spanMinutes(fromMin: number, toMin: number): number {
  return ((((toMin - fromMin) % 1440) + 1440) % 1440);
}

/** مسیر SVG قوس ساعتگرد از دقیقه‌ی from تا to روی شعاع r */
export function arcPath(c: number, r: number, fromMin: number, toMin: number): string {
  const span = spanMinutes(fromMin, toMin);
  if (span === 0) return "";
  const a0 = minuteToAngle(fromMin);
  const a1 = a0 + (span / 1440) * 360;
  const p0 = pointAt(c, r, a0);
  const p1 = pointAt(c, r, a1);
  const large = span > 720 ? 1 : 0;
  const f = (n: number) => n.toFixed(2);
  return `M${f(p0.x)} ${f(p0.y)} A${r} ${r} 0 ${large} 1 ${f(p1.x)} ${f(p1.y)}`;
}

/** "HH:MM" → دقیقه‌ی روز، یا null */
export function hhmmToMin(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v || "");
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

/** عرض تقریبی یک متن به واحد em (رقم‌های جدولی عریض‌تر از دونقطه) — برای جاکردن متن وسط صفحه */
export function textEm(text: string): number {
  let w = 0;
  for (const ch of text) {
    if (/[0-9]/.test(ch)) w += 0.66;
    else if (ch === ":" || ch === "." || ch === " ") w += 0.32;
    else w += 0.6;
  }
  return w;
}

/** بزرگ‌ترین اندازه‌ی فونت (کمتر یا مساوی base) که متن توی maxWidth جا بشه */
export function fitFontSize(text: string, base: number, maxWidth: number): number {
  const em = textEm(text);
  if (em <= 0) return base;
  return Math.min(base, Math.floor((maxWidth / em) * 10) / 10);
}

export type Star = { x: number; y: number; r: number; o: number };

/** تولید‌کننده‌ی شبه‌تصادفی قطعی (mulberry32) تا خروجی SSR و کلاینت یکی باشه */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * ستاره‌های کم‌تراکم و ثابت برای صفحه‌ی ساعت: n نقطه‌ی کوچک با سه شفافیت، فقط
 * داخل دایره‌ی شعاع rMax (نسبت به مرکز c) و بیرون از مستطیل متن وسط (|dx|<keepW، |dy|<keepH).
 * قطعی (seed ثابت) و گردشده تا هیدریشن بدون هشدار باشه.
 */
export function starField(n: number, seed: number, c: number, rMax: number, keepW: number, keepH: number): Star[] {
  const rand = rng(seed);
  const rd = (v: number) => Math.round(v * 10) / 10;
  const out: Star[] = [];
  const ops = [0.28, 0.5, 0.78];
  let guard = 0;
  while (out.length < n && guard++ < n * 60) {
    const ang = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * rMax;
    const dx = rr * Math.sin(ang), dy = -rr * Math.cos(ang);
    if (Math.abs(dx) < keepW && Math.abs(dy) < keepH) continue;
    // فاصله‌ی کم بین ستاره‌ها تا کنار هم نیفتن
    if (out.some((s) => (s.x - c - dx) ** 2 + (s.y - c - dy) ** 2 < 144)) continue;
    const k = rand();
    out.push({ x: rd(c + dx), y: rd(c + dy), r: k > 0.85 ? 1.7 : k > 0.5 ? 1.2 : 0.85, o: ops[Math.floor(rand() * 3)] });
  }
  return out;
}

export type GreetKey = "morning" | "afternoon" | "evening" | "night";

/** سلام بر اساس ساعت (0..23): صبح 4-12، عصر 12-19، شب‌نشینی 19-22، شب 22-4 */
export function greetKey(hour: number): GreetKey {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 4 && h < 12) return "morning";
  if (h >= 12 && h < 19) return "afternoon";
  if (h >= 19 && h < 22) return "evening";
  return "night";
}
