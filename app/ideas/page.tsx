"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { IdeasPanel } from "@/components/IdeasPanel";

export default function IdeasPage() {
  const { status } = useSession();

  return (
    <section>
      <h1>ایده‌ها</h1>
      <div className="section-note">هر چی برای این اپ به ذهنت رسید همین‌جا بنویس تا بعداً باهم دقیق‌ترش کنیم</div>

      {status === "authenticated" ? (
        <IdeasPanel />
      ) : (
        <>
          <div className="section-note" style={{ marginTop: 14 }}>برای ثبت ایده اول وارد حساب بشو.</div>
          <Link href="/auth/login" className="nav-link" style={{ display: "inline-block", marginTop: 10 }}>ورود / ثبت‌نام →</Link>
        </>
      )}
    </section>
  );
}
