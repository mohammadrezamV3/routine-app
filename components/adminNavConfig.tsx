import {
  LayoutGrid, Bell, Users, ShieldCheck, Coins, Receipt, CreditCard, BadgeDollarSign, Tag, LineChart, Boxes, Sparkles,
  Megaphone, Send, PartyPopper, CalendarClock, Dumbbell, UsersRound, Headset, Flag, GraduationCap, ServerCog, ToggleRight,
  Settings, History, FlaskConical,
} from "lucide-react";
import type { AdminPermission } from "@/lib/adminPermissions";

// منبع واحد ناوبری پنل — هم سایدبار، هم نوار پایین موبایل، هم پالت Ctrl K.
// badge = کلید شمارنده‌ی /api/admin/alerts که کنار آیتم نشون داده می‌شه.
export type NavLeaf = { label: string; href: string; perm?: AdminPermission; exact?: boolean };
export type NavItem = {
  label: string; href: string; icon: React.ReactNode; perm?: AdminPermission; ownerOnly?: boolean;
  badge?: "alerts" | "tickets" | "chat" | "mentors"; children?: NavLeaf[];
};
export type NavGroup = { title: string; items: NavItem[] };

const I = 16;

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "نمای کلی",
    items: [
      { label: "داشبورد", href: "/admin", icon: <LayoutGrid size={I} /> },
      { label: "هشدارها", href: "/admin/alerts", icon: <Bell size={I} />, badge: "alerts" },
    ],
  },
  {
    title: "کاربران",
    items: [
      { label: "همه‌ی کاربران", href: "/admin/users", icon: <Users size={I} />, perm: "users.view" },
      { label: "ادمین‌ها و نقش‌ها", href: "/admin/admins", icon: <ShieldCheck size={I} />, perm: "admins.manage" },
    ],
  },
  {
    title: "فروش و درآمد",
    items: [
      { label: "درآمد", href: "/admin/revenue", icon: <Coins size={I} />, perm: "finance" },
      { label: "تراکنش‌ها و بازپرداخت", href: "/admin/transactions", icon: <Receipt size={I} />, perm: "finance" },
      { label: "اشتراک‌ها", href: "/admin/subscriptions", icon: <CreditCard size={I} />, perm: "subscriptions" },
      { label: "قیمت پلن‌ها", href: "/admin/pricing", icon: <BadgeDollarSign size={I} />, perm: "pricing" },
      { label: "تخفیف و دعوت", href: "/admin/discount-codes", icon: <Tag size={I} />, perm: "discounts" },
    ],
  },
  {
    title: "رشد و تحلیل",
    items: [
      {
        label: "رشد و ماندگاری", href: "/admin/analytics/retention", icon: <LineChart size={I} />, perm: "analytics",
        children: [
          { label: "ماندگاری", href: "/admin/analytics/retention" },
          { label: "قیف تبدیل", href: "/admin/analytics/funnel" },
          { label: "ریزش", href: "/admin/analytics/churn" },
          { label: "کوهورت", href: "/admin/analytics/cohort" },
        ],
      },
      {
        label: "محصولات", href: "/admin/products/routine", icon: <Boxes size={I} />, perm: "analytics",
        children: [
          { label: "روتین", href: "/admin/products/routine" },
          { label: "بدنسازی", href: "/admin/products/exercise" },
          { label: "کالری", href: "/admin/products/calorie" },
          { label: "ترید", href: "/admin/products/trade" },
          { label: "یادگیری", href: "/admin/products/roadmap" },
        ],
      },
      { label: "مصرف AI", href: "/admin/ai-usage", icon: <Sparkles size={I} />, perm: "ai_usage" },
    ],
  },
  {
    title: "ارتباطات",
    items: [
      { label: "پیام همگانی", href: "/admin/broadcast", icon: <Send size={I} />, perm: "content" },
      { label: "اطلاعیه‌ها", href: "/admin/announcements", icon: <Megaphone size={I} />, perm: "content" },
      { label: "تم‌های مناسبتی", href: "/admin/event-themes", icon: <PartyPopper size={I} />, perm: "settings" },
    ],
  },
  {
    title: "محتوا",
    items: [
      { label: "تقویم اقتصادی", href: "/admin/economic-calendar", icon: <CalendarClock size={I} />, perm: "content" },
      { label: "عکس حرکات", href: "/admin/exercise-media", icon: <Dumbbell size={I} />, perm: "content" },
      { label: "تیم Arion Group", href: "/admin/team", icon: <UsersRound size={I} />, perm: "settings" },
    ],
  },
  {
    title: "پشتیبانی و نظارت",
    items: [
      { label: "تیکت‌ها", href: "/admin/support", icon: <Headset size={I} />, perm: "support", badge: "tickets" },
      { label: "گزارش‌های چت", href: "/admin/chat-reports", icon: <Flag size={I} />, perm: "chat", badge: "chat" },
      {
        label: "مربی‌ها", href: "/admin/mentors?tab=pending", icon: <GraduationCap size={I} />, perm: "mentors", badge: "mentors",
        children: [
          { label: "صف احراز هویت", href: "/admin/mentors?tab=pending", exact: true },
          { label: "همه‌ی مربی‌ها", href: "/admin/mentors?tab=all", exact: true },
          { label: "نظرات", href: "/admin/mentors/reviews" },
          { label: "گزارش‌ها", href: "/admin/mentors/reports" },
        ],
      },
    ],
  },
  {
    title: "سیستم",
    items: [
      {
        label: "وضعیت و خطاها", href: "/admin/system/status", icon: <ServerCog size={I} />, perm: "system",
        children: [
          { label: "وضعیت سرورها و منابع", href: "/admin/system/status" },
          { label: "خطاها و لاگ‌ها", href: "/admin/system/errors" },
        ],
      },
      { label: "قابلیت‌ها", href: "/admin/features", icon: <ToggleRight size={I} />, perm: "settings" },
      { label: "تنظیمات", href: "/admin/settings", icon: <Settings size={I} />, perm: "settings" },
      { label: "لاگ ادمین‌ها", href: "/admin/audit", icon: <History size={I} />, perm: "audit" },
      { label: "داده‌ی آزمایشی", href: "/admin/demo-data", icon: <FlaskConical size={I} />, ownerOnly: true },
    ],
  },
];

export type NavAccess = { isSuperAdmin: boolean; permissions: readonly string[] };
