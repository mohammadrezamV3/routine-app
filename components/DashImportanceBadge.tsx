import { Importance, IMPORTANCE_LABELS } from "@/lib/storage";

const STYLES: Record<Importance, { text: string; bg: string; border: string }> = {
  high: { text: "#E05252", bg: "rgba(224,82,82,.12)", border: "rgba(224,82,82,.3)" },
  medium: { text: "#F5C518", bg: "rgba(245,197,24,.12)", border: "rgba(245,197,24,.3)" },
  normal: { text: "var(--muted)", bg: "rgba(255,255,255,.05)", border: "var(--line)" },
};

export function DashImportanceBadge({ importance = "normal" }: { importance?: Importance }) {
  const s = STYLES[importance];
  return (
    <span
      className="shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px]"
      style={{ color: s.text, backgroundColor: s.bg, borderColor: s.border }}
    >
      {IMPORTANCE_LABELS[importance]}
    </span>
  );
}
