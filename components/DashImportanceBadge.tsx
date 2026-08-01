import { Importance, IMPORTANCE_LABELS } from "@/lib/storage";

const STYLES: Record<Importance, { text: string; bg: string; border: string }> = {
  veryHigh: { text: "#E05252", bg: "rgba(224,82,82,.12)", border: "rgba(224,82,82,.3)" },
  high: { text: "#F5A524", bg: "rgba(245,165,36,.12)", border: "rgba(245,165,36,.3)" },
  medium: { text: "#F5C518", bg: "rgba(245,197,24,.12)", border: "rgba(245,197,24,.3)" },
  low: { text: "var(--muted)", bg: "rgba(255,255,255,.05)", border: "var(--line)" },
};

export function DashImportanceBadge({ importance = "low" }: { importance?: Importance }) {
  const s = STYLES[importance];
  return (
    <span
      className="min-w-[48px] shrink-0 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-center text-[9px] font-semibold sm:min-w-[66px] sm:px-2.5 sm:py-1 sm:text-[11px]"
      style={{ color: s.text, backgroundColor: s.bg, borderColor: s.border }}
    >
      {IMPORTANCE_LABELS[importance]}
    </span>
  );
}
