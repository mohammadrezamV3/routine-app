"use client";

import { useEffect, useState } from "react";
import { Globe, Lock } from "lucide-react";
import { AccountToggleRow } from "@/components/AccountRow";
import { getAccount, invalidateAccountCache, AccountData } from "@/lib/accountCache";

// تمِ نمایش عمداً این‌جا نیست — دقیقاً همون سوییچِ بالای منوی همبرگری
// (NavDrawer) هست؛ تکرارِ همون قابلیت توی یه صفحه‌ی دیگه فقط سردرگم‌کننده‌ست.
export default function ArionSettingsPage() {
  const [discoverable, setDiscoverable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAccount().then((res: AccountData) => {
      const u = res?.user as { discoverable?: boolean } | undefined;
      setDiscoverable(u?.discoverable ?? true);
    });
  }, []);

  async function toggleDiscoverable(next: boolean) {
    if (saving) return;
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

  return (
    <section>
      <h1>تنظیمات آریون</h1>
      <div className="account-content-hint">تنظیمات کلیِ اپلیکیشن</div>

      <div className="account-card">
        <div className="account-row2">
          <span className="account-row2-icon"><Globe size={17} /></span>
          <span className="account-row2-body">
            <span className="account-row2-label">زبان</span>
            <span className="account-row2-desc">فعلاً فقط فارسی — زبان‌های دیگه به‌زودی اضافه می‌شن</span>
          </span>
        </div>
        {discoverable !== null && (
          <AccountToggleRow
            index={1}
            icon={<Lock size={16} />}
            label="قابل‌جست‌وجو بودن با یوزرنیم"
            desc="خاموش‌کردنش یعنی توی جست‌وجوی دوستان دیده نمی‌شی"
            checked={discoverable}
            onChange={toggleDiscoverable}
          />
        )}
      </div>
    </section>
  );
}
