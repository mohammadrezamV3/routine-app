"use client";

import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ModuleGate } from "@/components/ModuleGate";
import { AuthGate } from "@/components/AuthGate";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { TradeAccountView } from "@/components/TradeAccountView";

// این صفحه عنوانِ خودش را از دادهٔ حساب می‌سازد، پس برخلافِ بقیه‌ی
// زیرصفحه‌ها از TradePageShell استفاده نمی‌کند — ولی همان سه‌حالتیِ
// loading/مهمان/مجاز را عیناً تکرار می‌کند تا پرشِ «وارد شوید» این‌جا هم نباشد.
export default function TradeAccountPage({ params }: { params: { id: string } }) {
  const { status } = useSession();

  return (
    <section className="trade-desktop">
      {status === "loading" && <PanelSkeleton />}
      {status === "unauthenticated" && <AuthGate message="برای استفاده از این سرویس وارد شوید" />}
      {status === "authenticated" && (
        <ModuleGate module="TRADE">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            <TradeAccountView accountId={params.id} />
          </motion.div>
        </ModuleGate>
      )}
    </section>
  );
}
