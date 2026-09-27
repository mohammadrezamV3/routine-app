"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ensureStarted, subscribeLiveErrors } from "@/lib/liveSync";

/**
 * لایه‌ی زنده (lib/liveSync.ts) رو از همون اول راه می‌ندازه — BroadcastChannel،
 * رویدادهای WebSocket، focus/visibility/online و قلابِ نوشتن‌ها — و وقتی یه
 * تغییرِ optimistic روی سرور رد شد و برگشت خورد، پیامش رو نشون می‌ده.
 * همون مارک‌آپ/استایلِ پیامِ کوتاهِ DashReminderCard، نه یه ظاهرِ تازه.
 */
export function LiveSyncToaster() {
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    ensureStarted();
    setMounted(true);
    return subscribeLiveErrors((text) => setToast({ id: Date.now(), text }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!mounted) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4" aria-live="assertive">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="alert"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-auto rounded-2xl border border-dash-border bg-dash-card px-4 py-2.5 text-[12.5px] font-medium text-dash-text shadow-[0_16px_40px_rgba(0,0,0,.45)] backdrop-blur-xl sm:text-[13px]"
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
