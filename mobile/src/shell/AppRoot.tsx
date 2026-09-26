// ریشه‌ی اپ — آینه‌ی app/layout.tsxِ وب، با همون ترتیبِ providerها:
//   SvgFilters · BackgroundCanvas · [SyncProvider → نشست (AuthSessionProviderِ
//   وب روی shimِ next-auth/react)] → ThemeProvider → MotionTuner → .wrap
// تفاوت‌ها (عمدی): به‌جای NavTopbar تب‌بارِ پایین؛ بدونِ PwaProvider
// (سرویس‌ورکر هرگز)، NotificationEngine (یادآوری‌ها محلی‌ان)، InlineBootstrap
// و PRELOAD_SCRIPT (پیش‌درخواستِ شبکه‌ای — در اپ داده محلیه).
import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoutes } from "react-router-dom";
import { SvgFilters } from "@/components/SvgFilters";
import { BackgroundCanvas } from "@/components/BackgroundCanvas";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MotionTuner } from "@/components/MotionTuner";
import { readThemeFromDom } from "@/lib/themeColor";
import { SyncProvider } from "@m/sync/SyncProvider";
import { hideSplash, syncStatusBar } from "@m/lib/statusBar";
import { onRouteRefresh, setPrefetcher } from "@m/shims/navRegistry";
import { AppTabBar } from "./AppTabBar";
import { NotificationsBootstrap } from "./NotificationsBootstrap";
import { RouteBoundary } from "./RouteBoundary";
import { ScrollToTop } from "./ScrollToTop";
import { useHardwareBack } from "./hardwareBack";
import { buildRoutes, preloadPath, RouteSuspense, TAB_PREFETCH_PATHS } from "./routes";

setPrefetcher(preloadPath);

function AppRoutes() {
  const routes = useMemo(() => buildRoutes(), []);
  const element = useRoutes(routes);
  const location = useLocation();
  // router.refresh() ← remountِ صفحه‌ی فعلی
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => onRouteRefresh(() => setRefreshKey((k) => k + 1)), []);
  return (
    <RouteBoundary resetKey={location.key}>
      <RouteSuspense key={refreshKey}>{element}</RouteSuspense>
    </RouteBoundary>
  );
}

/** نوار وضعیتِ اندروید هم‌رنگِ تمِ فعلی (data-theme روی <html>) */
function useStatusBarThemeSync() {
  useEffect(() => {
    void syncStatusBar(readThemeFromDom());
    const obs = new MutationObserver(() => void syncStatusBar(readThemeFromDom()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
}

function ShellEffects() {
  useHardwareBack();
  useStatusBarThemeSync();
  useEffect(() => {
    void hideSplash();
    // چانکِ تب‌های اصلی در زمانِ بیکاری — ضربه‌ی بعدی منتظرِ دانلود نمی‌مونه
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const run = () => TAB_PREFETCH_PATHS.forEach(preloadPath);
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 1500);
  }, []);
  return null;
}

export function AppRoot() {
  return (
    <>
      <SvgFilters />
      <BackgroundCanvas />
      <SyncProvider>
        <AuthSessionProvider>
          <ThemeProvider>
            <MotionTuner>
              <ShellEffects />
              <ScrollToTop />
              <NotificationsBootstrap />
              <div className="wrap">
                <AppRoutes />
              </div>
              <AppTabBar />
            </MotionTuner>
          </ThemeProvider>
        </AuthSessionProvider>
      </SyncProvider>
    </>
  );
}
