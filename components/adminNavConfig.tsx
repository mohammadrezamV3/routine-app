import {
  LayoutGrid, Bell, Users, ShieldCheck, Coins, Receipt, CreditCard, BadgeDollarSign, Tag, LineChart, Boxes, Sparkles,
  Megaphone, Send, PartyPopper, CalendarClock, Dumbbell, UsersRound, Headset, Flag, GraduationCap, ServerCog, ToggleRight,
  Settings, History, FlaskConical,
} from "lucide-react";
import type { AdminPermission } from "@/lib/adminPermissions";
import { tr } from "@/lib/i18n";

// منبع واحد ناوبری پنل — هم سایدبار، هم نوار پایین موبایل، هم پالت Ctrl K.
// badge = کلید شمارنده‌ی /api/admin/alerts که کنار آیتم نشون داده می‌شه.
export type NavLeaf = { label: string; href: string; perm?: AdminPermission; exact?: boolean };
export type NavItem = {
  label: string; href: string; icon: React.ReactNode; perm?: AdminPermission; ownerOnly?: boolean;
  badge?: "alerts" | "tickets" | "chat" | "mentors"; children?: NavLeaf[];
};
export type NavGroup = { title: string; items: NavItem[] };

const I = 16;

// تابع (نه ثابت ماژول) تا برچسب‌ها با زبان جاری حل بشن
export function navGroups(): NavGroup[] {
  return [
    {
      title: tr("نمای کلی", "Overview"),
      items: [
        { label: tr("داشبورد", "Dashboard"), href: "/admin", icon: <LayoutGrid size={I} /> },
        { label: tr("هشدارها", "Alerts"), href: "/admin/alerts", icon: <Bell size={I} />, badge: "alerts" },
      ],
    },
    {
      title: tr("کاربران", "Users"),
      items: [
        { label: tr("همه‌ی کاربران", "All users"), href: "/admin/users", icon: <Users size={I} />, perm: "users.view" },
        { label: tr("ادمین‌ها و نقش‌ها", "Admins and roles"), href: "/admin/admins", icon: <ShieldCheck size={I} />, perm: "admins.manage" },
      ],
    },
    {
      title: tr("فروش و درآمد", "Sales and revenue"),
      items: [
        { label: tr("درآمد", "Revenue"), href: "/admin/revenue", icon: <Coins size={I} />, perm: "finance" },
        { label: tr("تراکنش‌ها و بازپرداخت", "Transactions and refunds"), href: "/admin/transactions", icon: <Receipt size={I} />, perm: "finance" },
        { label: tr("اشتراک‌ها", "Subscriptions"), href: "/admin/subscriptions", icon: <CreditCard size={I} />, perm: "subscriptions" },
        { label: tr("قیمت پلن‌ها", "Plan prices"), href: "/admin/pricing", icon: <BadgeDollarSign size={I} />, perm: "pricing" },
        { label: tr("تخفیف و دعوت", "Discounts and invites"), href: "/admin/discount-codes", icon: <Tag size={I} />, perm: "discounts" },
      ],
    },
    {
      title: tr("رشد و تحلیل", "Growth and analytics"),
      items: [
        {
          label: tr("رشد و ماندگاری", "Growth and retention"), href: "/admin/analytics/retention", icon: <LineChart size={I} />, perm: "analytics",
          children: [
            { label: tr("ماندگاری", "Retention"), href: "/admin/analytics/retention" },
            { label: tr("قیف تبدیل", "Funnel"), href: "/admin/analytics/funnel" },
            { label: tr("ریزش", "Churn"), href: "/admin/analytics/churn" },
            { label: tr("کوهورت", "Cohort"), href: "/admin/analytics/cohort" },
          ],
        },
        {
          label: tr("محصولات", "Products"), href: "/admin/products/routine", icon: <Boxes size={I} />, perm: "analytics",
          children: [
            { label: tr("روتین", "Routine"), href: "/admin/products/routine" },
            { label: tr("بدنسازی", "Workout"), href: "/admin/products/exercise" },
            { label: tr("کالری", "Calories"), href: "/admin/products/calorie" },
            { label: tr("ترید", "Trading"), href: "/admin/products/trade" },
            { label: tr("یادگیری", "Learning"), href: "/admin/products/roadmap" },
          ],
        },
        { label: tr("مصرف AI", "AI usage"), href: "/admin/ai-usage", icon: <Sparkles size={I} />, perm: "ai_usage" },
      ],
    },
    {
      title: tr("ارتباطات", "Communication"),
      items: [
        { label: tr("پیام همگانی", "Broadcast"), href: "/admin/broadcast", icon: <Send size={I} />, perm: "content" },
        { label: tr("اطلاعیه‌ها", "Announcements"), href: "/admin/announcements", icon: <Megaphone size={I} />, perm: "content" },
        { label: tr("تم‌های مناسبتی", "Event themes"), href: "/admin/event-themes", icon: <PartyPopper size={I} />, perm: "settings" },
      ],
    },
    {
      title: tr("محتوا", "Content"),
      items: [
        { label: tr("تقویم اقتصادی", "Economic calendar"), href: "/admin/economic-calendar", icon: <CalendarClock size={I} />, perm: "content" },
        { label: tr("عکس حرکات", "Exercise photos"), href: "/admin/exercise-media", icon: <Dumbbell size={I} />, perm: "content" },
        { label: tr("تیم Arion Group", "Arion Group team"), href: "/admin/team", icon: <UsersRound size={I} />, perm: "settings" },
      ],
    },
    {
      title: tr("پشتیبانی و نظارت", "Support and moderation"),
      items: [
        { label: tr("تیکت‌ها", "Tickets"), href: "/admin/support", icon: <Headset size={I} />, perm: "support", badge: "tickets" },
        { label: tr("گزارش‌های چت", "Chat reports"), href: "/admin/chat-reports", icon: <Flag size={I} />, perm: "chat", badge: "chat" },
        {
          label: tr("مربی‌ها", "Mentors"), href: "/admin/mentors?tab=pending", icon: <GraduationCap size={I} />, perm: "mentors", badge: "mentors",
          children: [
            { label: tr("صف احراز هویت", "Verification queue"), href: "/admin/mentors?tab=pending", exact: true },
            { label: tr("همه‌ی مربی‌ها", "All mentors"), href: "/admin/mentors?tab=all", exact: true },
            { label: tr("نظرات", "Reviews"), href: "/admin/mentors/reviews" },
            { label: tr("گزارش‌ها", "Reports"), href: "/admin/mentors/reports" },
          ],
        },
      ],
    },
    {
      title: tr("سیستم", "System"),
      items: [
        {
          label: tr("وضعیت و خطاها", "Status and errors"), href: "/admin/system/status", icon: <ServerCog size={I} />, perm: "system",
          children: [
            { label: tr("وضعیت سرورها و منابع", "Server and resource status"), href: "/admin/system/status" },
            { label: tr("خطاها و لاگ‌ها", "Errors and logs"), href: "/admin/system/errors" },
          ],
        },
        { label: tr("قابلیت‌ها", "Features"), href: "/admin/features", icon: <ToggleRight size={I} />, perm: "settings" },
        { label: tr("تنظیمات", "Settings"), href: "/admin/settings", icon: <Settings size={I} />, perm: "settings" },
        { label: tr("لاگ ادمین‌ها", "Admin log"), href: "/admin/audit", icon: <History size={I} />, perm: "audit" },
        { label: tr("داده‌ی آزمایشی", "Demo data"), href: "/admin/demo-data", icon: <FlaskConical size={I} />, ownerOnly: true },
      ],
    },
  ];
}

export type NavAccess = { isSuperAdmin: boolean; permissions: readonly string[] };
