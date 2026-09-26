// تب‌بارِ پایینِ اپ — جایگزینِ هدرِ وب (NavTopbar). همون شیشه‌ی `.app-topbar`
// (توکن‌های --surface-glass/--surface-line، بلور و هایلایتِ داخلی)، همون
// آیکون‌ها (components/NavIcons.tsx) و همون مدلِ منو/فیلترِ ماژول
// (components/useNavModel.ts). تب «منو» خودِ کشوی وب (NavMenuPanel) رو باز
// می‌کنه. در /auth/* مخفیه — دقیقا مثلِ هدرِ وب.
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { ICONS } from "@/components/NavIcons";
import { NavMenuPanel } from "@/components/NavMenuPanel";
import { ProfileMenuList } from "@/components/ProfileMenuList";
import { AgentAvatar } from "@/components/AgentAvatar";
import { isGroup, useNavModel, type NavItem } from "@/components/useNavModel";
import { getAvatarUrl } from "@/lib/accountCache";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { tapHaptic } from "@m/lib/haptics";
import { useBackHandler } from "./backStack";
import { preloadPath } from "./routes";

type TabKey = "routine" | "exercise" | "trade" | "profile" | "menu";

export function tabForPath(pathname: string): TabKey | null {
  if (pathname === "/weekly" || pathname.startsWith("/weekly/")) return "routine";
  if (pathname === "/exercise" || pathname.startsWith("/exercise/")) return "exercise";
  if (pathname === "/trade" || pathname.startsWith("/trade/")) return "trade";
  if (pathname === "/account" || pathname.startsWith("/account/")) return "profile";
  return null;
}

export function isTabBarHidden(pathname: string): boolean {
  return pathname.startsWith("/auth") || pathname.startsWith("/admin");
}

function findItem(items: NavItem[], icon: string): NavItem | undefined {
  return items.find((i) => i.icon === icon);
}

let cachedAvatarUrl: string | null = null;

function ProfileGlyph({ authed, name }: { authed: boolean; name: string }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cachedAvatarUrl);
  useEffect(() => {
    if (!authed) return;
    const load = () =>
      getAvatarUrl()
        .then((u) => {
          cachedAvatarUrl = u;
          setAvatarUrl(u);
        })
        .catch(() => undefined);
    load();
    window.addEventListener("avatar-updated", load);
    return () => window.removeEventListener("avatar-updated", load);
  }, [authed]);

  if (!authed) return <span className="app-tabbar-icon">{ICONS.account}</span>;
  return (
    <span className="app-tabbar-avatar profile-chip-avatar">
      {avatarUrl ? <img src={avatarUrl} alt="" className="profile-chip-avatar-img" /> : <AgentAvatar seed={name || "؟"} size={24} />}
    </span>
  );
}

export function AppTabBar() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { session, status, items, isLocked } = useNavModel();
  useLockBodyScroll(menuOpen);
  useBackHandler(menuOpen, () => setMenuOpen(false));

  // هر ناوبری (از هر مسیری) منو رو می‌بنده
  useEffect(() => setMenuOpen(false), [pathname]);

  if (isTabBarHidden(pathname)) return null;

  const active = menuOpen ? "menu" : tabForPath(pathname);
  const exercise = findItem(items, "exercise");
  const trade = findItem(items, "trade");
  const exerciseLocked = !!exercise && isGroup(exercise) && exercise.children.every((c) => isLocked(c.module));
  const tradeLocked = !!trade && !isGroup(trade) && isLocked(trade.module);
  const authed = status === "authenticated";
  const name = session?.user?.name || session?.user?.email || "";

  const tab = (key: TabKey, to: string, label: string, icon: JSX.Element, locked = false) => (
    <Link
      key={key}
      to={to}
      className={`app-tabbar-item${active === key ? " active" : ""}`}
      aria-current={active === key ? "page" : undefined}
      onTouchStart={() => preloadPath(to)}
      onClick={() => {
        void tapHaptic();
        setMenuOpen(false);
      }}
    >
      <span className="app-tabbar-glyph">
        {icon}
        {locked && <Lock size={10} className="app-tabbar-lock" />}
      </span>
      <span className="app-tabbar-label">{label}</span>
    </Link>
  );

  return (
    <>
      <NavMenuPanel open={menuOpen} onClose={() => setMenuOpen(false)}>
        {authed && (
          <div className="app-tabbar-menu-extra">
            <ProfileMenuList onPick={() => setMenuOpen(false)} />
          </div>
        )}
      </NavMenuPanel>
      <nav className="app-tabbar" aria-label="ناوبری اصلی">
        {tab("routine", "/weekly", "روتین", <span className="app-tabbar-icon">{ICONS.weekly}</span>)}
        {tab("exercise", "/exercise", "بدنسازی", <span className="app-tabbar-icon">{ICONS.exercise}</span>, exerciseLocked)}
        {tab("trade", "/trade", "ترید", <span className="app-tabbar-icon">{ICONS.trade}</span>, tradeLocked)}
        {tab("profile", "/account", "پروفایل", <ProfileGlyph authed={authed} name={name} />)}
        <button
          type="button"
          className={`app-tabbar-item${active === "menu" ? " active" : ""}`}
          aria-label="منو"
          aria-expanded={menuOpen}
          onClick={() => {
            void tapHaptic();
            setMenuOpen((o) => !o);
          }}
        >
          <span className="app-tabbar-glyph">
            <span className={`app-tabbar-burger${menuOpen ? " open" : ""}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </span>
          <span className="app-tabbar-label">منو</span>
        </button>
      </nav>
    </>
  );
}
