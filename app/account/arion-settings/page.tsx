import Link from "next/link";
import { Palette, Globe, Bell, Lock, ChevronLeft } from "lucide-react";

const ROWS = [
  { href: "/account/arion-settings/appearance", label: "ظاهر و تم", desc: "حالت روشن / تاریک", icon: <Palette size={17} /> },
  { href: "/account/arion-settings/language", label: "زبان", desc: "زبانِ رابط کاربری", icon: <Globe size={17} /> },
  { href: "/account/notifications", label: "اعلان‌ها", desc: "مدیریتِ کاملِ اعلان‌ها", icon: <Bell size={17} /> },
  { href: "/account/arion-settings/privacy", label: "حریم خصوصی", desc: "دیده‌شدن توسطِ دیگران", icon: <Lock size={17} /> },
];

export default function ArionSettingsPage() {
  return (
    <section>
      <h1>تنظیمات آریون</h1>
      <div className="account-content-hint">تنظیماتِ کلیِ اپلیکیشن</div>

      <div className="account-row-list">
        {ROWS.map((r) => (
          <Link key={r.href} href={r.href} className="account-row">
            <span className="account-row-icon">{r.icon}</span>
            <span className="account-row-body">
              <span className="account-row-label">{r.label}</span>
              <span className="account-row-desc">{r.desc}</span>
            </span>
            <ChevronLeft size={16} className="account-row-chevron" />
          </Link>
        ))}
      </div>
    </section>
  );
}
