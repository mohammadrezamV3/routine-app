import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import BottomTabBar from "@/components/BottomTabBar";
import PageTransition from "@/components/PageTransition";
import Dashboard from "@/screens/Dashboard";
import Routine from "@/screens/Routine";
import Exercise from "@/screens/Exercise";
import Trade from "@/screens/Trade";
import More from "@/screens/More";
import Login from "@/screens/Login";
import { useHardwareBack } from "@/lib/useHardwareBack";
import { useTheme } from "@/lib/useTheme";
import { hideSplash } from "@/lib/statusBar";

export default function App() {
  const location = useLocation();
  useHardwareBack();
  useTheme();

  useEffect(() => {
    void hideSplash();
  }, []);

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      <div style={{ paddingBottom: "calc(52px + env(safe-area-inset-bottom))" }}>
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/routine" element={<Routine />} />
              <Route path="/exercise" element={<Exercise />} />
              <Route path="/trade" element={<Trade />} />
              <Route path="/more" element={<More />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </PageTransition>
        </AnimatePresence>
      </div>
      <BottomTabBar />
    </div>
  );
}
