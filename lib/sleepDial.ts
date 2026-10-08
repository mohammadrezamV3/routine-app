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
