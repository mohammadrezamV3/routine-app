import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

// حالتِ «این ماژول در پلنت فعال نیست» — وقتی سرور ماژول رو قفل گزارش کرده
// (lockedModulesِ pull / moduleLockedِ ترید). داده‌های محلی دست نمی‌خورن و
// تغییرهای صف‌شده بعد از تمدید دوباره فرستاده می‌شن.
export default function LockedModuleScreen({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <main className="flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ minHeight: "60vh" }}>
      <Lock size={32} color="var(--muted)" />
      <p className="font-vazir text-[15px] font-semibold" style={{ color: "var(--text)" }}>
        {title} در پلنِ فعلیت فعال نیست
      </p>
      <p className="font-vazir text-[12.5px] leading-6" style={{ color: "var(--muted)" }}>
        داده‌های قبلیت روی همین دستگاه محفوظه و بعد از فعال‌شدنِ اشتراک دوباره همگام می‌شه.
      </p>
      <button
        type="button"
        onClick={() => navigate("/more/account")}
        className="mt-2 rounded-card border px-5 font-vazir text-[13.5px]"
        style={{ borderColor: "var(--surface-line)", color: "var(--text)", height: 44 }}
      >
        حساب و اشتراک
      </button>
    </main>
  );
}
