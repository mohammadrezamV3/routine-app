"use client";

import { useEffect, useState } from "react";
import { Vibrate } from "lucide-react";
import { AccountToggleRow } from "@/components/AccountRow";
import { AccountPageHead, AccountBlock } from "@/components/AccountUI";
import { hapticsEnabled, hapticsSupported, setHapticsEnabled } from "@/lib/haptics";

// «تنظیمات › بازخورد لمسی» — ترجیحِ همین دستگاه (lib/haptics.ts)، نه حساب
export default function HapticsSettingsPage() {
  const [haptics, setHaptics] = useState(true);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    setHaptics(hapticsEnabled());
    setAvailable(hapticsSupported());
  }, []);

  function toggle(next: boolean) {
    setHapticsEnabled(next);
    setHaptics(next);
    // روشن‌کردن با یک لرزشِ نمونه تایید می‌شه تا کاربر حسش کنه
    if (next) {
      try { navigator.vibrate?.(12); } catch {}
    }
  }

  return (
    <section>
      <AccountPageHead title="بازخورد لمسی" hint="لرزش کوتاه هنگام لمس دکمه‌ها" backHref="/account/general" backLabel="تنظیمات" />
      <AccountBlock flush index={0}>
        <AccountToggleRow
          icon={<Vibrate size={16} />}
          label="لرزش هنگام لمس دکمه‌ها"
          desc={available ? "فقط روی همین دستگاه اعمال می‌شه" : "این دستگاه یا مرورگر از لرزش پشتیبانی نمی‌کنه"}
          checked={haptics}
          onChange={toggle}
        />
      </AccountBlock>
    </section>
  );
}
