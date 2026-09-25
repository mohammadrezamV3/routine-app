import { faNum } from "@/lib/jalali";

// پورت از components/StreakFlame.tsx وب — presentational محض.
export default function StreakFlame({ streak, className }: { streak: number | null | undefined; className?: string }) {
  const tier = streak == null ? 0 : streak >= 100 ? 4 : streak >= 30 ? 3 : streak >= 7 ? 2 : streak >= 1 ? 1 : 0;
  const tierColor = ["var(--muted)", "#ff9a3c", "#ff7a1a", "#ff5200", "#ff2d00"][tier];

  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: tierColor }}>
        <path
          d="M12 2.2c1.1 3.1-2.6 4.7-2.6 8.3a2.6 2.6 0 0 0 5.2 0c0-1.1-.5-1.6-.5-2.7 1.6.9 2.7 2.7 2.7 4.8a4.8 4.8 0 0 1-9.6 0c0-4.3 3.2-6.4 4.8-10.4Z"
          fill="currentColor"
        />
      </svg>
      <span className="font-vazir" style={{ color: "var(--text)", fontWeight: 700, fontSize: 14 }}>
        {streak == null ? "…" : faNum(streak)}
      </span>
    </span>
  );
}
