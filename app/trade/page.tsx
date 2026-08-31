"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { MarketTicker } from "@/components/MarketTicker";

// هابِ بخشِ ترید. تا پیش از این، /trade مستقیماً ژورنال را نشان می‌داد و
// فقط با ?tab=checklist عوض می‌شد؛ حالا شش زیربخشِ اسپکِ محصول هرکدام مسیرِ
// خودشان را دارند و این صفحه فقط دروازه‌ی ورود است.

type HubItem = { href: string; title: string; desc: string; soon?: boolean };

const ITEMS: HubItem[] = [
  { href: "/trade/journal", title: "ژورنال‌نویسی", desc: "حساب‌های معاملاتی، ثبت معامله و آمار عملکرد" },
  { href: "/trade/checklists", title: "چک‌لیست", desc: "چک‌لیست‌های پیش از ورود و اتصالشان به معامله" },
  { href: "/trade/calendar", title: "تقویم اقتصادی", desc: "رویدادهای مهم بازار، با هشدار قبل از انتشار" },
  { href: "/trade/clock", title: "ساعت فارکس", desc: "وضعیت لحظه‌ای جلسه‌های معاملاتی" },
  { href: "/trade/notes", title: "یادداشت‌ها", desc: "تحلیل‌ها و تجربه‌های شخصی" },
  { href: "/trade/metatrader", title: "اتصال متاتریدر", desc: "دریافت خودکار معاملات، برای هر حساب جداگانه" },
];

export default function TradePage() {
  const { status } = useSession();

  return (
    <section className="trade-desktop">
      <MarketTicker />
      <h1>ترید</h1>
      <div className="section-note">از چک‌لیست تا ثبت معامله و تحلیل عملکرد — همه در یک جا</div>

      {status === "authenticated" ? (
        <ModuleGate module="TRADE">
          <div className="rm-grid">
            {ITEMS.map((it) =>
              it.soon ? (
                <div key={it.href} className="rm-box trade-hub-soon" aria-disabled="true">
                  <div>
                    <div className="rm-box-title">{it.title}</div>
                    <div className="rm-box-desc">{it.desc}</div>
                  </div>
                  <span className="trade-hub-soon-badge">به‌زودی</span>
                </div>
              ) : (
                <Link key={it.href} href={it.href} className="rm-box">
                  <div>
                    <div className="rm-box-title">{it.title}</div>
                    <div className="rm-box-desc">{it.desc}</div>
                  </div>
                </Link>
              )
            )}
          </div>
        </ModuleGate>
      ) : (
        <AuthGate message="برای استفاده از این سرویس وارد شوید" />
      )}
    </section>
  );
}
