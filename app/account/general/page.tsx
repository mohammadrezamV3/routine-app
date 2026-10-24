"use client";

import { BarChart3, Bell, CalendarCheck2, CandlestickChart, Dumbbell, Download, GraduationCap, History, Languages, Palette, Vibrate } from "lucide-react";
import { AccountRows, AccountRowLink, AccountControlRow } from "@/components/AccountRow";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { AccountPageHead } from "@/components/AccountUI";
import { useSection } from "@/components/SectionProvider";
import type { SectionKey } from "@/lib/sections";
import { tr } from "@/lib/i18n";

type Item = { href: string; label: string; desc: string; icon: React.ReactNode; sections?: SectionKey[] };

// sections: فقط روی این زیردامنه‌ها؛ ندادن = مشترک. دامنه‌ی اصلی (null) همه‌ی ردیف‌ها رو داره.
const forSection = (items: Item[], section: SectionKey | null) => items.filter((i) => !section || !i.sections || i.sections.includes(section));

// «تنظیمات» — طبق درخواست صریح هر بخش صفحه‌ی خودش را دارد: این‌جا فقط
// فهرست بخش‌هاست (در سه گروه) و با کلیک روی هرکدام تازه به تنظیمات همان
// بخش می‌رسی. زبان سایت (مهم‌ترین جای تغییر زبان) همین‌جا، در گروه اول.
const displayItems = (): Item[] => [
  { href: "/account/general/theme", label: tr("تم و رنگ", "Theme and color"), desc: tr("حالت شب یا روز و رنگ کل اپ", "Day or night mode and the color of the whole app"), icon: <Palette size={17} /> },
  { href: "/account/general/dashboard", label: tr("داشبورد", "Dashboard"), desc: tr("کارت‌های داشبورد", "Dashboard cards"), icon: <BarChart3 size={17} />, sections: ["routine", "workout"] },
  { href: "/account/general/export", label: tr("خروجی داده‌ها", "Data export"), desc: tr("دانلود داده‌هایت به‌صورت CSV یا JSON", "Download your data as CSV or JSON"), icon: <Download size={17} /> },
  { href: "/account/general/haptics", label: tr("بازخورد لمسی", "Haptic feedback"), desc: tr("لرزش کوتاه هنگام لمس دکمه‌ها", "A short vibration when you tap buttons"), icon: <Vibrate size={17} /> },
];
const sectionItems = (): Item[] => [
  { href: "/account/general/notifications", label: tr("اعلان‌ها", "Notifications"), desc: tr("یادآوری‌ها و نوتیفیکیشن‌ها", "Reminders and notifications"), icon: <Bell size={17} /> },
  { href: "/account/general/routine", label: tr("روتین", "Routine"), desc: tr("تنظیمات روتین", "Routine settings"), icon: <CalendarCheck2 size={17} />, sections: ["routine"] },
  { href: "/account/general/exercise", label: tr("بدنسازی", "Workout"), desc: tr("روز تمرین جامانده: رد شدن یا ماندن", "Missed workout day: skip or keep"), icon: <Dumbbell size={17} />, sections: ["workout"] },
  { href: "/account/general/trade", label: tr("ترید", "Trading"), desc: tr("تقویم، آمارها و هشدار اخبار", "Calendar, stats and news alerts"), icon: <CandlestickChart size={17} />, sections: ["trade"] },
];
const mentorItems = (): Item[] => [
  { href: "/account/general/mentors", label: tr("دسترسی مربی‌ها", "Mentor access"), desc: tr("مربی چه بخشی از روتینت را ببیند", "What your mentor can see of your routine"), icon: <GraduationCap size={17} />, sections: ["routine", "workout"] },
  { href: "/account/general/chats", label: tr("سابقه‌ی گفت‌وگو", "Chat history"), desc: tr("پاک کردن پیام‌های مربی‌ای برای خودت", "Clear mentor messages for yourself"), icon: <History size={17} /> },
];

export default function AccountSettingsPage() {
  const section = useSection();
  const displayRows = forSection(displayItems(), section);
  const sectionRows = forSection(sectionItems(), section);
  const mentorRows = forSection(mentorItems(), section);
  return (
    <section>
      <AccountPageHead title={tr("تنظیمات", "Settings")} />

      <AccountRows label={tr("نمایش و دستگاه", "Display and device")}>
        {displayRows.map((s, i) => (
          <AccountRowLink key={s.href} href={s.href} icon={s.icon} label={s.label} desc={s.desc} index={i} />
        ))}
        <AccountControlRow icon={<Languages size={17} />} label={tr("زبان", "Language")} desc={tr("زبان نمایش سایت", "Site language")} control={<LanguageSwitch />} index={displayRows.length} />
      </AccountRows>

      <AccountRows label={tr("یادآوری و بخش‌ها", "Reminders and sections")}>
        {sectionRows.map((s, i) => (
          <AccountRowLink key={s.href} href={s.href} icon={s.icon} label={s.label} desc={s.desc} index={i} />
        ))}
      </AccountRows>

      <AccountRows label={tr("مربی‌ها", "Mentors")}>
        {mentorRows.map((s, i) => (
          <AccountRowLink key={s.href} href={s.href} icon={s.icon} label={s.label} desc={s.desc} index={i} />
        ))}
      </AccountRows>
    </section>
  );
}
