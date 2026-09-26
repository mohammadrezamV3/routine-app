import { ReactNode, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { tapHaptic } from "@/lib/haptics";

const THRESHOLD = 64;
const MAX_PULL = 96;

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  /** وقتی false باشه (مثلا کاربر وارد نشده) کل ژست غیرفعال می‌شه — بدون سینک چیزی برای رفرش نیست. */
  enabled: boolean;
  children: ReactNode;
}

/**
 * کشیدنِ صفحه به پایین (فقط وقتی خودِ صفحه از بالا اسکرول شده، یعنی
 * window.scrollY === 0) syncNow رو صدا می‌زنه. روی هرکدوم از
 * Dashboard/Routine/TradeHub که این‌جا رو رپ می‌کنن استفاده می‌شه؛ وقتی
 * enabled=false (مهمانِ لاگین‌نکرده) کاملا شفاف رد می‌شه، بدونِ هیچ تغییری
 * در ظاهر یا رفتار.
 */
export default function PullToRefresh({ onRefresh, enabled, children }: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);

  if (!enabled) return <>{children}</>;

  function onTouchStart(e: React.TouchEvent) {
    if (refreshing) return;
    if (window.scrollY > 0) {
      startY.current = null;
      return;
    }
    startY.current = e.touches[0].clientY;
    dragging.current = true;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current || startY.current == null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    // اسکرول عادیِ صفحه رو نمی‌گیریم مگه وقتی واقعا در حالِ pull هستیم
    if (window.scrollY > 0) {
      dragging.current = false;
      setPull(0);
      return;
    }
    setPull(Math.min(MAX_PULL, delta * 0.5));
  }

  async function onTouchEnd() {
    dragging.current = false;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      void tapHaptic();
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
    startY.current = null;
  }

  const indicatorHeight = refreshing ? 40 : pull;

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        aria-hidden={!refreshing}
        role={refreshing ? "status" : undefined}
        aria-label={refreshing ? "در حال همگام‌سازی" : undefined}
        className="flex items-center justify-center overflow-hidden"
        style={{ height: indicatorHeight, transition: dragging.current ? "none" : "height 0.2s ease" }}
      >
        <motion.div animate={{ rotate: refreshing ? 360 : (pull / MAX_PULL) * 180 }} transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : undefined}>
          <RefreshCw size={18} color="var(--accent)" style={{ opacity: refreshing || pull > 8 ? 1 : 0 }} />
        </motion.div>
      </div>
      {children}
    </div>
  );
}
