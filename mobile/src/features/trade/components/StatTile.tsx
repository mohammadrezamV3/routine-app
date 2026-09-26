interface Props {
  label: string;
  value: string;
  positive?: boolean;
}

export default function StatTile({ label, value, positive }: Props) {
  const color =
    positive === undefined ? "var(--text)" : positive ? "var(--pnl-win)" : "var(--pnl-loss)";
  return (
    <div
      className="flex min-w-[100px] flex-1 flex-col gap-1 rounded-card border px-3 py-2.5"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}
    >
      <span className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <span className="font-vazir text-[15.5px] font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
