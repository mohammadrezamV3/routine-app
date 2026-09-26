import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import type { ExerciseCatalogEntry } from "../lib/exerciseCatalog";
import { useCatalogExercises, useExerciseMedia } from "@/sync/catalog";
import { useSync } from "@/sync/SyncProvider";
import { MuscleDiagram } from "../components/MuscleDiagram";
import { EmptyState } from "../components/ui";

type CatalogModule = { EXERCISE_CATALOG: ExerciseCatalogEntry[]; getExerciseDifficulty: (e: ExerciseCatalogEntry) => number };

/** کاتالوگِ کامل حرکات (~۸۵KB دیتا) فقط وقتی این صفحه واقعا باز بشه dynamic
 * import می‌شه — بقیه‌ی ماژول ورزش (پلن/کالری) هیچ‌وقت این حجم رو دانلود نمی‌کنه. */
function useCatalogModule(): CatalogModule | null {
  const [mod, setMod] = useState<CatalogModule | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("../lib/exerciseCatalog").then((m) => {
      if (!cancelled) setMod(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return mod;
}

// جستجو/مرورِ کاتالوگِ حرکات — کاملا آفلاین، همون دیتای وب
// (lib/exerciseCatalog.ts). هر ردیف با تپ باز می‌شه و نحوه‌ی انجام + مزایا
// + دیاگرامِ عضلاتِ درگیر رو نشون می‌ده.
export default function CatalogScreen() {
  const [query, setQuery] = useState("");
  const [openName, setOpenName] = useState<string | null>(null);
  const catalogModule = useCatalogModule();
  // کاتالوگِ دانلودشده از سرور (اگه هست)، وگرنه نسخه‌ی داخلِ باندل (وقتی لود شد)
  const catalog = useCatalogExercises<ExerciseCatalogEntry>(catalogModule?.EXERCISE_CATALOG ?? []);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return catalog.slice(0, 40);
    return catalog.filter((e) => e.name.indexOf(q) !== -1 || e.muscleGroup.indexOf(q) !== -1).slice(0, 60);
  }, [query, catalog]);

  return (
    <div>
      <AppHeader title="کاتالوگ حرکات" showBack />
      <div className="px-4 pt-3">
        <div
          className="flex items-center gap-2 rounded-xl px-3"
          style={{ height: 46, background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}
        >
          <Search size={16} color="var(--muted)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی حرکت یا گروهِ عضلانی…"
            className="min-w-0 flex-1 bg-transparent font-vazir text-[13.5px]"
            style={{ color: "var(--text)" }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-24 pt-3">
        {results.length === 0 && <EmptyState title="چیزی پیدا نشد" />}
        {results.map((entry) => {
          const open = openName === entry.name;
          return (
            <div key={entry.name} className="rounded-xl" style={{ background: "var(--surface-1)", border: "1px solid var(--surface-line)" }}>
              <button
                onClick={() => setOpenName(open ? null : entry.name)}
                className="flex w-full items-center gap-2 p-3 text-start"
                style={{ minHeight: 52 }}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-vazir text-[13.5px] font-medium" style={{ color: "var(--text)" }}>
                    {entry.name}
                  </p>
                  <p className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
                    {entry.muscleGroup} · سختی {catalogModule?.getExerciseDifficulty(entry) ?? "…"}/۵
                  </p>
                </div>
                <ChevronDown size={16} color="var(--muted)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
              {open && (
                <div className="flex flex-col gap-3 px-3 pb-3">
                  <ExerciseImage name={entry.name} />
                  <MuscleDiagram keys={entry.muscleKeys} />
                  <div>
                    <p className="mb-1 font-vazir text-[12px] font-semibold" style={{ color: "var(--text)" }}>
                      نحوه‌ی انجام
                    </p>
                    <ol className="flex flex-col gap-1">
                      {entry.howTo.map((step, i) => (
                        <li key={i} className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                          {i + 1}. {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <p className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                    {entry.benefits}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** عکسِ حرکت — تنبل: فقط وقتی کارت باز می‌شه از سرور گرفته و کش می‌شه */
function ExerciseImage({ name }: { name: string }) {
  const { api, isModuleLocked } = useSync();
  const url = useExerciseMedia(api, name, !isModuleLocked("EXERCISE"));
  if (!url) return null;
  return <img src={url} alt={name} loading="lazy" className="w-full rounded-lg object-contain" style={{ maxHeight: 220 }} />;
}
