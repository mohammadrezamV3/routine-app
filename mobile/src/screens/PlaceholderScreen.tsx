import AppHeader from "@/components/AppHeader";

interface PlaceholderScreenProps {
  title: string;
  note: string;
}

export default function PlaceholderScreen({ title, note }: PlaceholderScreenProps) {
  return (
    <div>
      <AppHeader title={title} />
      <main className="px-4 pt-4">
        <div
          className="rounded-card border p-5"
          style={{ background: "var(--surface-1)", borderColor: "var(--surface-line)" }}
        >
          <p className="font-vazir text-[13.5px]" style={{ color: "var(--muted)" }}>
            {note}
          </p>
        </div>
      </main>
    </div>
  );
}
