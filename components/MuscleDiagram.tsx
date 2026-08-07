"use client";

import { motion } from "framer-motion";
import { MuscleKey } from "@/lib/exerciseCatalog";

// دیاگرامِ ساده‌شده‌ی بدن (نمای جلو + پشت) — عضله‌های درگیر با رنگِ طلایی
// روشن می‌شن، بقیه‌ی بدن فقط طرح‌واره‌ی خاکستریه. هر muscleKey به یک یا چند
// شکلِ ثابت روی این دو نما مچ می‌شه (BODY_REGIONS پایین).

type Region = { key: MuscleKey; view: "front" | "back"; shape: React.ReactNode };

const REGIONS: Region[] = [
  // ---- جلو ----
  { key: "shoulders", view: "front", shape: <circle cx="24" cy="38" r="9" /> },
  { key: "shoulders", view: "front", shape: <circle cx="96" cy="38" r="9" /> },
  { key: "chest", view: "front", shape: <ellipse cx="45" cy="48" rx="13" ry="11" /> },
  { key: "chest", view: "front", shape: <ellipse cx="75" cy="48" rx="13" ry="11" /> },
  { key: "biceps", view: "front", shape: <rect x="14" y="46" width="14" height="28" rx="7" /> },
  { key: "biceps", view: "front", shape: <rect x="92" y="46" width="14" height="28" rx="7" /> },
  { key: "forearms", view: "front", shape: <rect x="10" y="76" width="12" height="30" rx="6" /> },
  { key: "forearms", view: "front", shape: <rect x="98" y="76" width="12" height="30" rx="6" /> },
  { key: "abs", view: "front", shape: <rect x="48" y="64" width="24" height="30" rx="6" /> },
  { key: "obliques", view: "front", shape: <rect x="38" y="66" width="8" height="26" rx="4" /> },
  { key: "obliques", view: "front", shape: <rect x="74" y="66" width="8" height="26" rx="4" /> },
  { key: "quads", view: "front", shape: <rect x="38" y="104" width="18" height="46" rx="8" /> },
  { key: "quads", view: "front", shape: <rect x="64" y="104" width="18" height="46" rx="8" /> },
  { key: "calves", view: "front", shape: <rect x="40" y="154" width="14" height="40" rx="7" /> },
  { key: "calves", view: "front", shape: <rect x="66" y="154" width="14" height="40" rx="7" /> },

  // ---- پشت ----
  { key: "traps", view: "back", shape: <path d="M50,26 L70,26 L86,42 L60,50 L34,42 Z" /> },
  { key: "back", view: "back", shape: <rect x="46" y="44" width="28" height="42" rx="10" /> },
  { key: "back", view: "back", shape: <rect x="30" y="48" width="14" height="36" rx="7" /> },
  { key: "back", view: "back", shape: <rect x="76" y="48" width="14" height="36" rx="7" /> },
  { key: "triceps", view: "back", shape: <rect x="14" y="46" width="14" height="28" rx="7" /> },
  { key: "triceps", view: "back", shape: <rect x="92" y="46" width="14" height="28" rx="7" /> },
  { key: "forearms", view: "back", shape: <rect x="10" y="76" width="12" height="30" rx="6" /> },
  { key: "forearms", view: "back", shape: <rect x="98" y="76" width="12" height="30" rx="6" /> },
  { key: "glutes", view: "back", shape: <rect x="40" y="98" width="40" height="22" rx="10" /> },
  { key: "hamstrings", view: "back", shape: <rect x="38" y="122" width="18" height="32" rx="8" /> },
  { key: "hamstrings", view: "back", shape: <rect x="64" y="122" width="18" height="32" rx="8" /> },
  { key: "calves", view: "back", shape: <rect x="40" y="156" width="14" height="38" rx="7" /> },
  { key: "calves", view: "back", shape: <rect x="66" y="156" width="14" height="38" rx="7" /> },
];

function BodyOutline() {
  return (
    <g fill="none" stroke="var(--line)" strokeWidth="1.5">
      <circle cx="60" cy="14" r="11" />
      <path d="M26,34 L94,34 L82,100 L38,100 Z" />
      <path d="M22,38 L12,104" />
      <path d="M98,38 L108,104" />
      <path d="M42,100 L38,194 M56,100 L54,194 M78,100 L82,194 M64,100 L66,194" />
    </g>
  );
}

function DiagramView({ view, active }: { view: "front" | "back"; active: Set<MuscleKey> }) {
  return (
    <svg viewBox="0 0 120 200" width="100%" height="100%" className="max-w-[92px] sm:max-w-[110px]">
      <BodyOutline />
      {REGIONS.filter((r) => r.view === view).map((r, i) => {
        const isActive = active.has(r.key);
        return (
          <motion.g
            key={`${view}-${r.key}-${i}`}
            initial={false}
            animate={{ opacity: isActive ? 1 : 0.16 }}
            transition={{ duration: 0.25 }}
            fill={isActive ? "url(#muscle-diagram-grad)" : "var(--muted)"}
            style={isActive ? { filter: "drop-shadow(0 0 4px rgba(255,196,60,.7))" } : undefined}
          >
            {r.shape}
          </motion.g>
        );
      })}
    </svg>
  );
}

export function MuscleDiagram({ keys }: { keys: MuscleKey[] }) {
  const active = new Set(keys);
  const hasFront = keys.some((k) => REGIONS.some((r) => r.key === k && r.view === "front"));
  const hasBack = keys.some((k) => REGIONS.some((r) => r.key === k && r.view === "back"));

  if (!hasFront && !hasBack) return null;

  return (
    <div className="flex items-center justify-center gap-4">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="muscle-diagram-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE68A" />
            <stop offset="100%" stopColor="#F5A623" />
          </linearGradient>
        </defs>
      </svg>
      {hasFront && (
        <div className="flex flex-col items-center gap-1.5">
          <DiagramView view="front" active={active} />
          <span className="text-[9px] text-dash-muted sm:text-[10px]">نمای جلو</span>
        </div>
      )}
      {hasBack && (
        <div className="flex flex-col items-center gap-1.5">
          <DiagramView view="back" active={active} />
          <span className="text-[9px] text-dash-muted sm:text-[10px]">نمای پشت</span>
        </div>
      )}
    </div>
  );
}
