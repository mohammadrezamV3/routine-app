"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { TradeJournal } from "@/components/TradeJournal";
import { TradeChecklist } from "@/components/TradeChecklist";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { MarketTicker } from "@/components/MarketTicker";

// انتخابِ ژورنال/چک‌لیست دیگه تبِ روی صفحه نداره — فقط از منوی «ترید» ←
// «ژورنال»/«چک‌لیست» ممکنه؛ هم‌قاعده‌ی app/exercise/page.tsx، از
// useSearchParams واقعی (نه خوندنِ یک‌بارِ window.location) استفاده شده تا
// کلیکِ نو-لینکِ منو وقتی از قبل توی همین صفحه‌ای هم زنده اثر کنه.
function TradeTabContent() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "checklist" ? "checklist" : "journal";

  return status === "authenticated" ? (
    <ModuleGate module="TRADE">
      {tab === "checklist" ? <TradeChecklist /> : <TradeJournal />}
    </ModuleGate>
  ) : (
    <AuthGate message="برای استفاده از این سرویس وارد شوید" />
  );
}

export default function TradePage() {
  return (
    <section className="trade-desktop">
      <MarketTicker />
      <h1>ترید</h1>
      <div style={{ marginTop: 14 }}>
        <Suspense fallback={null}>
          <TradeTabContent />
        </Suspense>
      </div>
    </section>
  );
}
