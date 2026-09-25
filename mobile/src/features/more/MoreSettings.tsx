import { useState } from "react";
import { Moon, Sun, Trash2, RotateCw } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import ListRow from "@/components/ListRow";
import BottomSheet from "@/components/BottomSheet";
import { useTheme } from "@/lib/useTheme";
import { useMoreContext } from "./MoreContext";

export default function MoreSettings() {
  const { mode, toggle } = useTheme();
  const { lastSyncTime, onSync, isSyncing, onClearData, notificationsEnabled, onNotificationsToggle } = useMoreContext();
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const handleClearData = () => {
    onClearData();
    setClearConfirmOpen(false);
  };

  return (
    <div>
      <AppHeader title="تنظیمات" showBack />
      <main className="pt-2">
        {/* تم */}
        <div style={{ paddingTop: 8, paddingBottom: 12 }}>
          <div
            className="px-4 pb-2 font-vazir text-[12px] font-semibold"
            style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            نمایش
          </div>
        </div>

        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 border-b px-4"
          style={{ borderColor: "var(--surface-line)", minHeight: 52 }}
        >
          {mode === "dark" ? (
            <Moon size={18} color="var(--muted)" />
          ) : (
            <Sun size={18} color="var(--muted)" />
          )}
          <span className="flex-1 text-start font-vazir text-[14.5px]" style={{ color: "var(--text)" }}>
            تم: {mode === "dark" ? "تاریک" : "روشن"}
          </span>
          <div
            className="h-7 w-12 rounded-full flex items-center px-1 cursor-pointer transition-colors"
            style={{ background: mode === "dark" ? "var(--muted2)" : "var(--muted2)" }}
          >
            <div
              className="h-5 w-5 rounded-full bg-white transition-transform"
              style={{ transform: mode === "dark" ? "translateX(0)" : "translateX(100%)" }}
            />
          </div>
        </button>

        {/* اطلاعات‌رسانی */}
        <div style={{ paddingTop: 16, paddingBottom: 12 }}>
          <div
            className="px-4 pb-2 font-vazir text-[12px] font-semibold"
            style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            اطلاعات‌رسانی
          </div>
        </div>

        <button
          onClick={() => onNotificationsToggle(!notificationsEnabled)}
          className="flex w-full items-center gap-3 border-b px-4"
          style={{ borderColor: "var(--surface-line)", minHeight: 52 }}
        >
          <div
            className="h-5 w-9 rounded-full flex items-center px-1 cursor-pointer transition-colors"
            style={{ background: notificationsEnabled ? "var(--text)" : "var(--muted2)" }}
          >
            <div
              className="h-3.5 w-3.5 rounded-full bg-white transition-transform"
              style={{ transform: notificationsEnabled ? "translateX(100%)" : "translateX(0)" }}
            />
          </div>
          <span className="flex-1 text-start font-vazir text-[14.5px]" style={{ color: "var(--text)" }}>
            اطلاع‌رسانی‌ها
          </span>
        </button>

        {/* زبان - ثابت فارسی */}
        <div style={{ paddingTop: 16, paddingBottom: 12 }}>
          <div
            className="px-4 pb-2 font-vazir text-[12px] font-semibold"
            style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            تنظیمات
          </div>
        </div>

        <div className="flex w-full items-center gap-3 border-b px-4" style={{ borderColor: "var(--surface-line)", minHeight: 52 }}>
          <span className="flex-1 text-start font-vazir text-[14.5px]" style={{ color: "var(--text)" }}>
            زبان
          </span>
          <span className="font-vazir text-[14.5px]" style={{ color: "var(--muted)" }}>
            فارسی
          </span>
        </div>

        {/* داده‌ها */}
        <div style={{ paddingTop: 16, paddingBottom: 12 }}>
          <div
            className="px-4 pb-2 font-vazir text-[12px] font-semibold"
            style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            داده‌ها
          </div>
        </div>

        <ListRow
          icon={<RotateCw size={18} color="var(--muted)" />}
          label={isSyncing ? "درحال همگام‌سازی..." : "همگام‌سازی الان"}
          onClick={onSync}
        />

        {lastSyncTime && (
          <div className="flex w-full items-center gap-3 border-b px-4" style={{ borderColor: "var(--surface-line)", minHeight: 52 }}>
            <span className="flex-1 text-start font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
              آخرین همگام‌سازی: {lastSyncTime}
            </span>
          </div>
        )}

        <ListRow
          icon={<Trash2 size={18} color="var(--pnl-loss)" />}
          label="پاک‌کردن داده‌های محلی"
          onClick={() => setClearConfirmOpen(true)}
          danger
        />
      </main>

      <BottomSheet open={clearConfirmOpen} onClose={() => setClearConfirmOpen(false)} title="تأیید">
        <div className="space-y-4">
          <p className="font-vazir text-[14px]" style={{ color: "var(--text)" }}>
            آیا می‌خواهید تمام داده‌های محلی را پاک کنید؟ این عملیات برگشت‌پذیر نیست.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setClearConfirmOpen(false)}
              className="flex-1 px-4 py-3 rounded-lg font-vazir text-[14px] transition-colors"
              style={{ background: "var(--surface-2)", color: "var(--text)" }}
            >
              لغو
            </button>
            <button
              onClick={handleClearData}
              className="flex-1 px-4 py-3 rounded-lg font-vazir text-[14px] transition-colors"
              style={{ background: "var(--pnl-loss)", color: "white" }}
            >
              پاک‌کردن
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
