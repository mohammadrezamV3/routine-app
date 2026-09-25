import AppHeader from "@/components/AppHeader";

export default function Dashboard() {
  return (
    <div>
      <AppHeader title="داشبورد" />
      <main className="px-4 pt-4">
        <div
          className="rounded-card border p-5"
          style={{ background: "var(--surface-1)", borderColor: "var(--surface-line)" }}
        >
          <p className="font-vazir text-[15px]" style={{ color: "var(--text)" }}>
            به آریون خوش اومدی 👋
          </p>
          <p className="mt-2 font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
            این نسخه‌ی موبایل هنوز placeholderه — بعدا با لاگین و سینک به بک‌اند وصل می‌شه.
          </p>
        </div>
      </main>
    </div>
  );
}
