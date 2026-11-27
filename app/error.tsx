"use client";

import { useEffect, useState } from "react";
import { hardRecover, isChunkErrorLike } from "@/lib/assetRecovery";
import { tr } from "@/lib/i18n";

// بدون این فایل، هر خطای رندر (مثلا ChunkLoadError از next/dynamic بعد از دیپلوی یا روی
// شبکه‌ی ضعیف) کل اپ رو با صفحه‌ی خالی «Application error» می‌انداخت تا رفرش دستی.
// خطای چانک → ریلود نگهبان‌دار (یک بار، lib/assetRecovery.ts) بی‌صدا و بدون هیچ پیامی؛
// اگه ریلود قبلا انجام شده (یا ممکن نیست) خطای عمومی با دکمه‌ی تلاش دوباره نشون داده می‌شه.
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const chunk = isChunkErrorLike(error);
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (!chunk) return;
    let alive = true;
    void hardRecover("route-error").then((ok) => { if (alive && !ok) setGaveUp(true); }, () => { if (alive) setGaveUp(true); });
    return () => { alive = false; };
  }, [chunk]);

  if (chunk && !gaveUp) return null;

  return (
    <section style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12, padding: "40px 16px" }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{tr("مشکلی در نمایش صفحه پیش اومد", "Something went wrong while showing this page")}</div>
      <button type="button" className="auth-full-btn" style={{ marginTop: 8, width: "auto", padding: "10px 24px" }} onClick={() => (chunk ? window.location.reload() : reset())}>
        {tr("تلاش دوباره", "Try again")}
      </button>
    </section>
  );
}
