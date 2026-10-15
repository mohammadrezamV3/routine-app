"use client";

import { useEffect, useState } from "react";
import { Vibrate } from "lucide-react";
import { AccountToggleRow } from "@/components/AccountRow";
import { AccountPageHead, AccountBlock } from "@/components/AccountUI";
import { hapticsEnabled, hapticsSupported, setHapticsEnabled } from "@/lib/haptics";
import { tr } from "@/lib/i18n";

// «تنظیمات › بازخورد لمسی» — ترجیح همین دستگاه (lib/haptics.ts)، نه حساب
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
    // روشن‌کردن با یک لرزش نمونه تایید می‌شه تا کاربر حسش کنه
    if (next) {
      try { navigator.vibrate?.(12); } catch {}
    }
  }

  return (
    <section>
      <AccountPageHead title={tr("بازخورد لمسی", "Haptic feedback")} hint={tr("لرزش کوتاه هنگام لمس دکمه‌ها", "A short vibration when you tap buttons")} backHref="/account/general" backLabel={tr("تنظیمات", "Settings")} />
      <AccountBlock flush index={0}>
        <AccountToggleRow
          icon={<Vibrate size={16} />}
          label={tr("لرزش هنگام لمس دکمه‌ها", "Vibrate when tapping buttons")}
          desc={available ? tr("فقط روی همین دستگاه اعمال می‌شه", "Applies to this device only") : tr("این دستگاه یا مرورگر از لرزش پشتیبانی نمی‌کنه", "This device or browser does not support vibration")}
          checked={haptics}
          onChange={toggle}
        />
      </AccountBlock>
    </section>
  );
}
