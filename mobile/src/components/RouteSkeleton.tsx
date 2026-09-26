// fallbackِ سبکِ Suspense برای مسیرهای lazy (App.tsx) — فقط چند بلاکِ
// pulse نشون می‌ده تا چانکِ فیچر لود بشه؛ هیچ داده/آیکونِ خاصی نمی‌خواد.
export default function RouteSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 pt-4" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl"
          style={{ height: i === 0 ? 88 : 56, background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}
        />
      ))}
    </div>
  );
}
