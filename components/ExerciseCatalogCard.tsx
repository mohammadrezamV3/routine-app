"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";
import { DashCard } from "./DashCard";
import { EXERCISE_CATALOG } from "@/lib/exerciseCatalog";
import { ExerciseCatalogModal } from "./ExerciseCatalogModal";

// «مشاهده حرکات» — کنارِ کارتِ دوستان، هم‌قد و هم‌شکلش: یه پیش‌نمایشِ کوچیک
// از کاتالوگ + دکمه‌ای که مودالِ کاملِ جستجو/جزئیاتِ حرکات رو باز می‌کنه.
// سه حرکتِ شاخص از سه گروهِ عضلانیِ متفاوت — پیش‌نمایشِ متنوع‌تر از سه‌تا
// اسکوات پشتِ‌سرهم (که با ترتیبِ خامِ کاتالوگ پیش میومد)
const PREVIEW_NAMES = ["اسکوات هالتر", "پرس سینه هالتر", "زیربغل هالتر خم"];

export function ExerciseCatalogCard({ delay }: { delay?: number }) {
  const [openName, setOpenName] = useState<string | null>(null);
  const preview = PREVIEW_NAMES
    .map((n) => EXERCISE_CATALOG.find((e) => e.name === n))
    .filter((e): e is (typeof EXERCISE_CATALOG)[number] => !!e);

  return (
    <DashCard delay={delay}>
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-dash-text sm:text-[15px]">مشاهده حرکات</h2>
        <button
          type="button"
          onClick={() => setOpenName("")}
          className="text-[11px] font-semibold text-dash-green hover:underline sm:text-[12.5px]"
        >
          مشاهده همه
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:gap-2.5">
        {preview.map((e) => (
          <button
            key={e.name}
            type="button"
            onClick={() => setOpenName(e.name)}
            className="flex items-center gap-2 rounded-xl px-1 py-1 text-right transition hover:bg-white/[0.03]"
          >
            <ListChecks className="h-3.5 w-3.5 shrink-0 text-dash-muted" />
            <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-dash-text sm:text-[12.5px]">{e.name}</span>
          </button>
        ))}
      </div>

      {openName !== null && <ExerciseCatalogModal initialName={openName} onClose={() => setOpenName(null)} />}
    </DashCard>
  );
}
