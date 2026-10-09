"use client";

import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { AccountBlock, AccountOption } from "@/components/AccountUI";
import { getSetting, setSetting } from "@/lib/storage";
import { SETTING_KEYS } from "@/lib/userSettingKeys";
import { isoLocal } from "@/lib/jalali";
import {
  DEFAULT_MISSED_DAY_PREF, MISSED_DAY_MODE_OPTIONS, MissedDayMode, MissedDayPref,
  normalizeMissedDayPref, prefForMode,
} from "@/lib/exerciseProgression";
import { tr } from "@/lib/i18n";

const modeHint = (): Record<MissedDayMode, string> => ({
  skip: tr("اگه روز تمرین بدون «شروع تمرین» بگذره، برنامه طبق تقویم جلو می‌ره — مثلا پا جا موند، فردا سرشانه.", "If a training day passes without pressing Start workout, the plan follows the calendar: if legs were missed, tomorrow is still shoulders."),
  stay: tr("تمرین جامانده فردا دوباره میاد و تا وقتی «شروع تمرین» رو براش نزنی همون می‌مونه؛ بقیه‌ی برنامه هم به همون اندازه عقب می‌ره.", "A missed workout comes back tomorrow and stays until you press Start workout for it; the rest of the plan shifts back by the same amount."),
});

// «تنظیمات › بدنسازی» — رفتار برنامه با روز جامانده (lib/exerciseProgression.ts).
export function ExerciseSettings() {
  const [pref, setPref] = useState<MissedDayPref>(DEFAULT_MISSED_DAY_PREF);

  useEffect(() => {
    getSetting<unknown>(SETTING_KEYS.exerciseMissedDay, null).then((v) => setPref(normalizeMissedDayPref(v))).catch(() => {});
  }, []);

  function changeMode(mode: MissedDayMode) {
    if (mode === pref.mode) return;
    // «ماندن» از امروز شمرده می‌شه؛ پلن فعال رو داشبورد بدنسازی خودش روی نشانگر می‌ذاره.
    const next = prefForMode(mode, isoLocal(new Date()), null);
    setPref(next);
    setSetting(SETTING_KEYS.exerciseMissedDay, next);
  }

  return (
    <AccountBlock icon={<Dumbbell size={15} />} title={tr("بدنسازی", "Workout")}>
      <AccountOption label={tr("روز تمرین جامانده", "Missed training day")}>
        <div className="item-line" style={{ marginBottom: 10 }}>{modeHint()[pref.mode]}</div>
        <SegmentedTabs options={MISSED_DAY_MODE_OPTIONS} active={pref.mode} onChange={changeMode} />
      </AccountOption>
    </AccountBlock>
  );
}
