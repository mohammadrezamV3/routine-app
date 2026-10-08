"use client";

// دکمه‌ی آیکونی «اشتراک کارنامه» (بی‌بک‌گراند، trade-icon-btn) + خود پنجره.
// فقط وقتی ماژول ترید فعاله دیده می‌شه (گیت واقعی سمت سرور: /api/trade/share).
// با deepLink، آدرس ?share=1 پنجره رو یک بار باز می‌کنه و پارامتر پاک می‌شه.

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Share2 } from "lucide-react";
import { activeModulesOf, getAccount } from "@/lib/accountCache";
import dynamic from "next/dynamic";
import { preloadWhenIdle } from "@/lib/preloadIdle";
import { useFeature } from "@/lib/useFeatures";

// پنجره‌ی اشتراک (رندر canvas کارنامه) فقط با کلیک لازم می‌شه
const loadPanel = () => import("./TradeSharePanel").then((m) => m.TradeSharePanel);
const TradeSharePanel = dynamic(loadPanel, { ssr: false });

export function TradeShareButton({ account = "all", deepLink = false, className, size = 17 }: {
  account?: string;
  deepLink?: boolean;
  className?: string;
  size?: number;
}) {
  const { status } = useSession();
  // فلگ tradeShare از پنل ادمین (/admin/features) — خاموش یعنی دکمه نیست
  const flagOn = useFeature("tradeShare") === true;
  const [moduleOk, setAllowed] = useState(false);
  const allowed = moduleOk && flagOn;
  const [open, setOpen] = useState(false);
  const [ever, setEver] = useState(false);
  useEffect(() => { if (open) setEver(true); }, [open]);
  useEffect(() => { if (allowed) preloadWhenIdle(loadPanel); }, [allowed]);

  useEffect(() => {
    if (status !== "authenticated") { setAllowed(false); return; }
    let alive = true;
    getAccount()
      .then((d) => { if (alive) setAllowed(!!d?.user && activeModulesOf(d).has("TRADE")); })
      .catch(() => { if (alive) setAllowed(false); });
    return () => { alive = false; };
  }, [status]);

  useEffect(() => {
    if (!deepLink || !allowed) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("share") !== "1") return;
    url.searchParams.delete("share");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    setOpen(true);
  }, [deepLink, allowed]);

  if (!allowed) return null;
  return (
    <>
      <button
        type="button"
        className={`trade-icon-btn${className ? ` ${className}` : ""}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="اشتراک کارنامه‌ی ترید"
        title="اشتراک کارنامه"
      >
        <Share2 size={size} />
      </button>
      {ever && <TradeSharePanel open={open} onClose={() => setOpen(false)} initialAccount={account} />}
    </>
  );
}
