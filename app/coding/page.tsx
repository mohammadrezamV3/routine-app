"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { CodingPanel } from "@/components/CodingPanel";
import { ModuleGate } from "@/components/ModuleGate";

export default function CodingPage() {
  const { status } = useSession();

  return (
    <section>
      <h1>کدنویسی</h1>

      {status === "authenticated" ? (
        <ModuleGate module="CODING">
          <CodingPanel />
        </ModuleGate>
      ) : (
        <>
          <div className="section-note" style={{ marginTop: 14 }}>
            برای ثبت تمرین کدنویسی و دیدن استریکت اول وارد حساب بشو.
          </div>
          <Link href="/auth/login" className="nav-link" style={{ display: "inline-block", marginTop: 10 }}>ورود / ثبت‌نام →</Link>
        </>
      )}
    </section>
  );
}
