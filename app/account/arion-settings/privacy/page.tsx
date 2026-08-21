"use client";

import { useEffect, useState } from "react";
import { getAccount, invalidateAccountCache, AccountData } from "@/lib/accountCache";

export default function PrivacySettingsPage() {
  const [discoverable, setDiscoverable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAccount().then((res: AccountData) => {
      const u = res?.user as { discoverable?: boolean } | undefined;
      setDiscoverable(u?.discoverable ?? true);
    });
  }, []);

  async function toggle() {
    if (discoverable === null || saving) return;
    const next = !discoverable;
    setSaving(true);
    setDiscoverable(next);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discoverable: next }),
      });
      if (!res.ok) setDiscoverable(!next);
      else invalidateAccountCache();
    } catch {
      setDiscoverable(!next);
    } finally {
      setSaving(false);
    }
  }

  if (discoverable === null) return null;

  return (
    <section>
      <h1>حریم خصوصی</h1>
      <div className="account-content-hint">کنترلِ اینکه دیگران چطور می‌تونن پیدات کنن</div>

      <div className="task" style={{ cursor: "pointer", padding: "8px 0" }} onClick={toggle}>
        <div className={`check${discoverable ? " on" : ""}`}>
          <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div>
          <div className="task-name">قابل‌جست‌وجو بودن با یوزرنیم</div>
          <div className="item-line" style={{ marginTop: 2 }}>وقتی خاموشه، توی جست‌وجوی دوستان دیده نمی‌شی — دوستی‌های قبلی و درخواست‌های در انتظار عوض نمی‌شن.</div>
        </div>
      </div>
    </section>
  );
}
