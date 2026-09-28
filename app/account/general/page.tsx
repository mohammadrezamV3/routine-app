"use client";

import { BarChart3, Bell, CalendarCheck2, CandlestickChart, GraduationCap } from "lucide-react";
import { AccountRowLink } from "@/components/AccountRow";
import { AccountPageHead } from "@/components/AccountUI";

// «تنظیمات» — طبقِ درخواستِ صریح هر بخش صفحه‌ی خودش را دارد: این‌جا فقط
// فهرستِ بخش‌هاست و با کلیک روی هرکدام تازه به تنظیماتِ همان بخش می‌رسی.
const SETTINGS_SECTIONS: { href: string; label: string; desc: string; icon: React.ReactNode }[] = [
  { href: "/account/general/dashboard", label: "داشبورد", desc: "کارت‌های داشبورد", icon: <BarChart3 size={15} /> },
  { href: "/account/general/notifications", label: "اعلان‌ها", desc: "یادآوری‌ها و نوتیفیکیشن‌ها", icon: <Bell size={15} /> },
  { href: "/account/general/routine", label: "روتین", desc: "تنظیمات روتین", icon: <CalendarCheck2 size={15} /> },
  { href: "/account/general/trade", label: "ترید", desc: "تقویم، آمارها و هشدار اخبار", icon: <CandlestickChart size={15} /> },
  { href: "/account/general/mentors", label: "دسترسی منتورها", desc: "منتور چه بخشی از روتینت را ببیند", icon: <GraduationCap size={15} /> },
];

export default function AccountSettingsPage() {
  return (
    <section>
      <AccountPageHead title="تنظیمات" />
      <div className="account-card account-card-full">
        {SETTINGS_SECTIONS.map((s, i) => (
          <AccountRowLink key={s.href} href={s.href} icon={s.icon} label={s.label} desc={s.desc} index={i} />
        ))}
      </div>
    </section>
  );
}
