// بک‌گراند نور محیطی (aurora) — جایگزین شبکه نقطه‌های به‌هم‌متصل قبلی.
// چند بلاب نرم و تار سبز که آروم شناورن؛ آرام‌تر، شیک‌تر و به‌مراتب سبک‌تر
// (کاملاً CSS، بدون canvas/rAF/mousemove) — مناسب‌تر برای صفحه‌ی معرفی محصول.
export function BackgroundCanvas() {
  return (
    <div id="bgCanvas" aria-hidden="true">
      <span className="aurora-blob aurora-blob-a" />
      <span className="aurora-blob aurora-blob-b" />
      <span className="aurora-blob aurora-blob-c" />
    </div>
  );
}
