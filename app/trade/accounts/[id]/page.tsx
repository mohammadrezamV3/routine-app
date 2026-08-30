"use client";

import { useSession } from "next-auth/react";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { TradeAccountView } from "@/components/TradeAccountView";

export default function TradeAccountPage({ params }: { params: { id: string } }) {
  const { status } = useSession();
  return (
    <section className="trade-desktop">
      {status === "authenticated" ? (
        <ModuleGate module="TRADE"><TradeAccountView accountId={params.id} /></ModuleGate>
      ) : (
        <AuthGate message="برای استفاده از این سرویس وارد شوید" />
      )}
    </section>
  );
}
