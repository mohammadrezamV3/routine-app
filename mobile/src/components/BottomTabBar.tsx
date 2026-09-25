import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, ListChecks, Dumbbell, LineChart, Menu } from "lucide-react";
import { tapHaptic } from "@/lib/haptics";

interface Tab {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

// ترتیب راست‌به‌چپ یعنی اولین آیتم لیست سمت راست‌ترین تب دیده می‌شه،
// چون کل صفحه dir="rtl" است (flex-row در RTL از راست شروع می‌شه).
const TABS: Tab[] = [
  { to: "/", label: "داشبورد", icon: LayoutDashboard },
  { to: "/routine", label: "روتین", icon: ListChecks },
  { to: "/exercise", label: "ورزش", icon: Dumbbell },
  { to: "/trade", label: "ترید", icon: LineChart },
  { to: "/more", label: "بیشتر", icon: Menu },
];

export default function BottomTabBar() {
  return (
    <nav
      aria-label="ناوبری اصلی"
      className="no-select fixed inset-x-0 bottom-0 z-40 flex border-t"
      style={{
        borderColor: "var(--surface-line)",
        background: "var(--surface-1)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === "/"}
          onClick={() => void tapHaptic()}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2"
          style={{ minHeight: 52 }}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute top-0 h-0.5 w-8 rounded-full"
                  style={{ background: "var(--accent)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <tab.icon
                size={22}
                strokeWidth={isActive ? 2.4 : 1.8}
                color={isActive ? "var(--accent)" : "var(--muted)"}
              />
              <span
                className="text-[11px] font-vazir"
                style={{ color: isActive ? "var(--accent)" : "var(--muted)" }}
              >
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
