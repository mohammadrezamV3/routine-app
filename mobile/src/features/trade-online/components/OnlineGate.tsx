import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CloudOff, LogIn } from "lucide-react";
import LockedModuleScreen from "@/components/LockedModuleScreen";
import { useSync } from "@/sync/SyncProvider";

// دروازه‌ی مشترکِ صفحه‌های آنلاینِ ترید:
//   • سرور تنظیم نشده / مهمان → پیامِ «ورود لازمه» (این بخش‌ها داده‌ی زنده‌ی
//     سرورن، نسخه‌ی محلی ندارن)
//   • TRADE قفل (از pull یا از ۴۰۳ِ خودِ این API‌ها) → LockedModuleScreen
// گیتِ واقعی سمتِ سروره (requireModule)؛ این فقط UIِ تمیزتره.
export default function OnlineGate({ locked, children }: { locked?: boolean; children: ReactNode }) {
  const { enabled, loggedIn, ready, isModuleLocked } = useSync();
  const navigate = useNavigate();

  if (!ready) return null;
  if (locked || (loggedIn && isModuleLocked("TRADE"))) return <LockedModuleScreen title="ترید" />;
  if (!enabled || !loggedIn) {
    return (
      <main className="flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ minHeight: "60vh" }}>
        <CloudOff size={32} color="var(--muted)" />
        <p className="font-vazir text-[15px] font-semibold" style={{ color: "var(--text)" }}>
          این بخش آنلاینه
        </p>
        <p className="font-vazir text-[12.5px] leading-6" style={{ color: "var(--muted)" }}>
          {enabled
            ? "تقویم اقتصادی، قیمت‌ها و اتصال متاتریدر از سرور خونده می‌شن — اول وارد حسابت شو."
            : "اتصال به سرور در این نسخه‌ی اپ پیکربندی نشده."}
        </p>
        {enabled && (
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-2 flex items-center gap-2 rounded-card border px-5 font-vazir text-[13.5px]"
            style={{ borderColor: "var(--surface-line)", color: "var(--text)", height: 44 }}
          >
            <LogIn size={16} /> ورود
          </button>
        )}
      </main>
    );
  }
  return <>{children}</>;
}
