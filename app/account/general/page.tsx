"use client";

import { BarChart3, Bell, CalendarCheck2, CandlestickChart, Dumbbell, GraduationCap, History, Languages, Vibrate } from "lucide-react";
import { AccountRows, AccountRowLink, AccountControlRow } from "@/components/AccountRow";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { AccountPageHead } from "@/components/AccountUI";
import { tr } from "@/lib/i18n";

type Item = { href: string; label: string; desc: string; icon: React.ReactNode };

// «تنظیمات» — طبق درخواست صریح هر بخش صفحه‌ی خودش را دارد: این‌جا فقط
// فهرست بخش‌هاست (در سه گروه) و با کلیک روی هرکدام تازه به تنظیمات همان
// بخش می‌رسی. زبان سایت (مهم‌ترین جای تغییر زبان) همین‌جا، در گروه اول.
const displayItems = (): Item[] => [
  { href: "/account/general/dashboard", label: tr("داشبورد", "Dashboard"), desc: tr("کارت‌های داشبورد", "Dashboard cards"), icon: <BarChart3 size={17} /> },
  { href: "/account/general/haptics", label: tr("بازخورد لمسی", "Haptic feedback"), desc: tr("لرزش کوتاه هنگام لمس دکمه‌ها", "A short vibration when you tap buttons"), icon: <Vibrate size={17} /> },
];
const sectionItems = (): Item[] => [
  { href: "/account/general/notifications", label: tr("اعلان‌ها", "Notifications"), desc: tr("یادآوری‌ها و نوتیفیکیشن‌ها", "Reminders and notifications"), icon: <Bell size={17} /> },
  { href: "/account/general/routine", label: tr("روتین", "Routine"), desc: tr("تنظیمات روتین", "Routine settings"), icon: <CalendarCheck2 size={17} /> },
  { href: "/account/general/exercise", label: tr("بدنسازی", "Workout"), desc: tr("روز تمرین جامانده: رد شدن یا ماندن", "Missed workout day: skip or keep"), icon: <Dumbbell size={17} /> },
  { href: "/account/general/trade", label: tr("ترید", "Trading"), desc: tr("تقویم، آمارها و هشدار اخبار", "Calendar, stats and news alerts"), icon: <CandlestickChart size={17} /> },
];
const mentorItems = (): Item[] => [
  { href: "/account/general/mentors", label: tr("دسترسی مربی‌ها", "Mentor access"), desc: tr("مربی چه بخشی از روتینت را ببیند", "What your mentor can see of your routine"), icon: <GraduationCap size={17} /> },
  { href: "/account/general/chats", label: tr("سابقه‌ی گفت‌وگو", "Chat history"), desc: tr("پاک کردن پیام‌های مربی‌ای برای خودت", "Clear mentor messages for yourself"), icon: <History size={17} /> },
];

export default function AccountSettingsPage() {
  return (
    <section>
      <AccountPageHead title={tr("تنظیمات", "Settings")} />

      <AccountRows label={tr("نمایش و دستگاه", "Display and device")}>
        {displayItems().map((s, i) => (
          <AccountRowLink key={s.href} href={s.href} icon={s.icon} label={s.label} desc={s.desc} index={i} />
        ))}
        <AccountControlRow icon={<Languages size={17} />} label={tr("زبان", "Language")} desc={tr("زبان نمایش سایت", "Site language")} control={<LanguageSwitch />} index={displayItems().length} />
      </AccountRows>

      <AccountRows label={tr("یادآوری و بخش‌ها", "Reminders and sections")}>
        {sectionItems().map((s, i) => (
          <AccountRowLink key={s.href} href={s.href} icon={s.icon} label={s.label} desc={s.desc} index={i} />
        ))}
      </AccountRows>

      <AccountRows label={tr("مربی‌ها", "Mentors")}>
        {mentorItems().map((s, i) => (
          <AccountRowLink key={s.href} href={s.href} icon={s.icon} label={s.label} desc={s.desc} index={i} />
        ))}
      </AccountRows>
    </section>
  );
}
