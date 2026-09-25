import { LogOut, User, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import ListRow from "@/components/ListRow";
import { useMoreContext } from "./MoreContext";

export default function MoreAccount() {
  const navigate = useNavigate();
  const { isLoggedIn, userName, userPhone, planName, modules, onLogout } = useMoreContext();

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  if (!isLoggedIn) {
    return (
      <div>
        <AppHeader title="حساب کاربری" showBack />
        <main className="flex flex-col items-center justify-center gap-4" style={{ minHeight: "70vh", padding: 20 }}>
          <User size={48} color="var(--muted)" />
          <p className="font-vazir text-[14.5px] text-center" style={{ color: "var(--text)" }}>
            برای دیدن اطلاعات حساب کاربری خود، لطفاً وارد شوید.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 px-6 py-3 rounded-lg font-vazir text-[14px] transition-colors"
            style={{ background: "var(--accent)", color: "white" }}
          >
            ورود / ثبت‌نام
          </button>
        </main>
      </div>
    );
  }

  return (
    <div>
      <AppHeader title="حساب کاربری" showBack />
      <main className="pt-2">
        {/* اطلاعات کاربر */}
        <div style={{ paddingTop: 8, paddingBottom: 12 }}>
          <div
            className="px-4 pb-2 font-vazir text-[12px] font-semibold"
            style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            پروفایل
          </div>
        </div>

        {userName && (
          <div className="flex w-full items-center gap-3 border-b px-4" style={{ borderColor: "var(--surface-line)", minHeight: 52 }}>
            <span className="flex-1 text-start font-vazir text-[14.5px]" style={{ color: "var(--muted)" }}>
              نام
            </span>
            <span className="font-vazir text-[14.5px]" style={{ color: "var(--text)" }}>
              {userName}
            </span>
          </div>
        )}

        {userPhone && (
          <div className="flex w-full items-center gap-3 border-b px-4" style={{ borderColor: "var(--surface-line)", minHeight: 52 }}>
            <span className="flex-1 text-start font-vazir text-[14.5px]" style={{ color: "var(--muted)" }}>
              تلفن
            </span>
            <span className="font-vazir text-[14.5px] font-mono" style={{ color: "var(--text)" }} dir="ltr">
              {userPhone}
            </span>
          </div>
        )}

        {/* طرح و ماژول‌ها */}
        {planName && (
          <>
            <div style={{ paddingTop: 16, paddingBottom: 12 }}>
              <div
                className="px-4 pb-2 font-vazir text-[12px] font-semibold"
                style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}
              >
                طرح
              </div>
            </div>

            <div className="flex w-full items-center gap-3 border-b px-4" style={{ borderColor: "var(--surface-line)", minHeight: 52 }}>
              <span className="flex-1 text-start font-vazir text-[14.5px]" style={{ color: "var(--text)" }}>
                {planName}
              </span>
            </div>
          </>
        )}

        {modules.length > 0 && (
          <>
            <div style={{ paddingTop: 16, paddingBottom: 12 }}>
              <div
                className="px-4 pb-2 font-vazir text-[12px] font-semibold"
                style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}
              >
                ماژول‌های فعال
              </div>
            </div>

            {modules.map((module, idx) => (
              <div
                key={module.key}
                className="flex w-full items-center gap-3 border-b px-4"
                style={{ borderColor: "var(--surface-line)", minHeight: 52 }}
              >
                <span className="flex-1 text-start font-vazir text-[14.5px]" style={{ color: "var(--text)" }}>
                  {module.label}
                </span>
              </div>
            ))}
          </>
        )}

        {/* دستگاه‌ها */}
        <div style={{ paddingTop: 16, paddingBottom: 12 }}>
          <div
            className="px-4 pb-2 font-vazir text-[12px] font-semibold"
            style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            دستگاه‌ها
          </div>
        </div>

        <div className="flex w-full items-center gap-3 border-b px-4" style={{ borderColor: "var(--surface-line)", minHeight: 52 }}>
          <Smartphone size={18} color="var(--muted)" />
          <span className="flex-1 text-start font-vazir text-[13.5px]" style={{ color: "var(--muted)" }}>
            مدیریت دستگاه‌ها از نسخه‌ی وب آریون دسترسی‌پذیر است.
          </span>
        </div>

        {/* خروج */}
        <div style={{ paddingTop: 16, paddingBottom: 12 }}>
          <div
            className="px-4 pb-2 font-vazir text-[12px] font-semibold"
            style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            امنیت
          </div>
        </div>

        <ListRow
          icon={<LogOut size={18} color="var(--pnl-loss)" />}
          label="خروج"
          onClick={handleLogout}
          danger
        />
      </main>
    </div>
  );
}
