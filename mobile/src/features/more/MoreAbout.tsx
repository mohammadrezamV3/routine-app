import { FileText, Mail } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import ListRow from "@/components/ListRow";

export default function MoreAbout() {
  const appVersion = import.meta.env.VITE_APP_VERSION || "0.1.0";

  const handleOpenExternal = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div>
      <AppHeader title="درباره" showBack />
      <main className="pt-4">
        {/* اطلاعات اپ */}
        <div className="px-4 py-6">
          <h2 className="font-vazir text-[18px] font-semibold" style={{ color: "var(--text)" }}>
            آریون
          </h2>
          <p className="font-vazir text-[13.5px] mt-2 leading-7" style={{ color: "var(--muted)" }}>
            آریون یک اپلیکیشن فارسی برای نظم‌دادن به زندگی روزمره است. برنامه‌ریزی روزانه، ورزش، کالری‌شماری، ژورنال ترید و رودمپ یادگیری — همه در یک حساب کاربری.
          </p>
          <div className="mt-4 font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
            نسخه: {appVersion}
          </div>
        </div>

        {/* لینک‌ها */}
        <div style={{ paddingTop: 8, paddingBottom: 12 }}>
          <div
            className="px-4 pb-2 font-vazir text-[12px] font-semibold"
            style={{ color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            منابع
          </div>
        </div>

        <ListRow
          icon={<FileText size={18} color="var(--muted)" />}
          label="قوانین و مقررات"
          onClick={() => handleOpenExternal("/terms")}
        />

        <ListRow
          icon={<Mail size={18} color="var(--muted)" />}
          label="پشتیبانی"
          onClick={() => handleOpenExternal("mailto:support@arion.ir")}
        />

        {/* توضیحات بیشتر */}
        <div className="px-4 py-6">
          <h3 className="font-vazir text-[15px] font-semibold" style={{ color: "var(--text)" }}>
            درباره‌ی آریون
          </h3>
          <div className="mt-4 space-y-4 font-vazir text-[13.5px] leading-7" style={{ color: "var(--muted)" }}>
            <p>
              <strong style={{ color: "var(--text)" }}>چرا آریون ساخته شد؟</strong>
              <br />
              مشکل اصلی نبود ابزار نبود؛ پخش‌بودن ابزارها بود. آریون برای این ساخته شد که تمام جنبه‌های زندگی‌ات را در یک جا مدیریت کنی.
            </p>
            <p>
              <strong style={{ color: "var(--text)" }}>برای چه کسانی؟</strong>
              <br />
              برای کسی که می‌خواهد روی روتین روزانه‌اش کنترل داشته باشد، ورزش و تغذیه‌اش را پیگیری کند یا معاملاتش را ثبت کند.
            </p>
            <p>
              <strong style={{ color: "var(--text)" }}>حریم خصوصی</strong>
              <br />
              اطلاعاتی که در آریون ثبت می‌کنی فقط برای خودت قابل مشاهده است. رمز عبار با bcrypt هش می‌شود و ارتباط روی HTTPS رمزنگاری‌شده است.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
