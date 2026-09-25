import { lazy, ReactNode, Suspense, useEffect } from "react";
import { Routes, Route, useLocation, useNavigationType, UNSAFE_LocationContext, type Location } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import BottomTabBar from "@/components/BottomTabBar";
import PageTransition from "@/components/PageTransition";
import RouteSkeleton from "@/components/RouteSkeleton";
import Dashboard from "@/screens/Dashboard";
import Routine from "@/screens/Routine";
import More from "@/screens/More";
import Login from "@/screens/Login";
import LockedModuleScreen from "@/components/LockedModuleScreen";
import AppHeader from "@/components/AppHeader";
import { useHardwareBack } from "@/lib/useHardwareBack";
import { useTheme } from "@/lib/useTheme";
import { hideSplash } from "@/lib/statusBar";
import { SyncProvider, useSync } from "@/sync/SyncProvider";
import { useNotifications } from "@/notifications";

// چهار ماژولِ فیچر (ورزش/ترید/رودمپ/بیشتر) هرکدوم lazy chunk جدا هستن —
// چانکِ اصلی (Dashboard/Routine/Login که همیشه لازمن) دیگه صفحات دیگه رو
// حمل نمی‌کنه؛ Suspense پایین‌تر یک اسکلتونِ سبک نشون می‌ده تا چانک لود بشه.
const FitnessRoutes = lazy(() => import("@/features/fitness").then((m) => ({ default: m.FitnessRoutes })));
const TradeRoutes = lazy(() => import("@/features/trade"));
const MoreRoutes = lazy(() => import("@/features/more").then((m) => ({ default: m.MoreRoutes })));
const RoadmapRoutes = lazy(() => import("@/features/roadmaps").then((m) => ({ default: m.RoadmapRoutes })));

/**
 * صفحه‌ی در حالِ خروج (AnimatePresence) باید با location ِ *خودش* رندر بشه، نه
 * location ِ فعلی — وگرنه <Routes>ِ داخلیِ فیچرها (FitnessRoutes، TradeRoutes، …)
 * که useLocation رو از context می‌خونن، حینِ انیمیشنِ خروج صفحه‌ی مقصد (یا هیچ)
 * رو نشون می‌دن. این wrapper همون location ِ لحظه‌ی ساخت رو ثابت نگه می‌داره.
 */
function FrozenLocation({ location, children }: { location: Location; children: ReactNode }) {
  const navigationType = useNavigationType();
  return <UNSAFE_LocationContext.Provider value={{ location, navigationType }}>{children}</UNSAFE_LocationContext.Provider>;
}

/** ماژولِ ترید برای کاربری که سرور قفلش گزارش کرده (مهمان کاملا محلی کار می‌کنه) */
function TradeGate() {
  const { isModuleLocked } = useSync();
  if (isModuleLocked("TRADE")) {
    return (
      <div>
        <AppHeader title="ترید" />
        <LockedModuleScreen title="ژورنالِ ترید" />
      </div>
    );
  }
  return <TradeRoutes />;
}

/** یادآوری‌های محلی: باید داخلِ Router (برای دیپ‌لینکِ تپ روی نوتیف) و
 *  داخلِ SyncProvider (برای gate کردنِ یادآورِ کالری با isModuleLocked) بمونه. */
function NotificationsBootstrap() {
  useNotifications();
  return null;
}

export default function App() {
  const location = useLocation();
  useHardwareBack();
  useTheme();

  useEffect(() => {
    void hideSplash();
  }, []);

  return (
    <SyncProvider>
      <NotificationsBootstrap />
      <div style={{ minHeight: "100dvh", background: "var(--bg)" }}>
        <div style={{ paddingBottom: "calc(52px + env(safe-area-inset-bottom))" }}>
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              <FrozenLocation location={location}>
                <Suspense fallback={<RouteSkeleton />}>
                  <Routes location={location}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/routine" element={<Routine />} />
                    <Route path="/exercise/*" element={<FitnessRoutes />} />
                    <Route path="/trade/*" element={<TradeGate />} />
                    <Route path="/more" element={<More />} />
                    <Route path="/more/*" element={<MoreRoutes />} />
                    <Route path="/roadmaps/*" element={<RoadmapRoutes />} />
                    <Route path="/login" element={<Login />} />
                  </Routes>
                </Suspense>
              </FrozenLocation>
            </PageTransition>
          </AnimatePresence>
        </div>
        <BottomTabBar />
      </div>
    </SyncProvider>
  );
}
