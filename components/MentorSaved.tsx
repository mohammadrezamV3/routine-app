"use client";

import "./mentor.css";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import type { MentorCard as MentorCardData, SavedMentorsResponse } from "@/lib/mentorTypes";
import { NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { M_DUR, mT } from "./MentorMotion";

// «ذخیره‌شده‌ها» (نشانکِ منتور) — یک منبعِ حالت برای همه‌ی کارت‌ها و پروفایل،
// تا نشانکِ یک منتور در ویترین، نتیجه‌ها و تبِ ذخیره‌شده‌ها هم‌زمان عوض شود.
// سقف و ضدِ IDOR سمتِ سرور است (lib/savedMentors.ts)؛ این‌جا فقط به‌روزرسانیِ
// خوش‌بینانه + برگرداندن در خطا + یک پیامِ کوتاهِ پایینِ صفحه.

type Ctx = {
  /** null تا وقتی فهرست دریافت نشده */
  cards: MentorCardData[] | null;
  ids: Set<string>;
  max: number;
  error: string | null;
  isSaved: (userId: string) => boolean;
  toggle: (mentor: MentorCardData | { userId: string }) => Promise<void>;
  reload: () => void;
  busy: (userId: string) => boolean;
};

const SavedCtx = createContext<Ctx | null>(null);

export function useSavedMentors(): Ctx | null {
  return useContext(SavedCtx);
}

export function SavedMentorsProvider({ children, initialSaved }: { children: React.ReactNode; initialSaved?: { userId: string; saved: boolean } }) {
  const [cards, setCards] = useState<MentorCardData[] | null>(null);
  const [ids, setIds] = useState<Set<string>>(() => new Set(initialSaved?.saved ? [initialSaved.userId] : []));
  const [max, setMax] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text });
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const reload = useCallback(() => {
    setError(null);
    fetch("/api/mentors/saved", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) { setError(await readApiError(r, "ذخیره‌شده‌ها دریافت نشد؛ دوباره تلاش کن")); setCards((c) => c ?? []); return; }
        const d: SavedMentorsResponse = await r.json();
        setCards(d.mentors);
        setIds(new Set(d.mentors.map((m) => m.userId)));
        setMax(d.max);
      })
      .catch(() => { setError(NETWORK_ERROR); setCards((c) => c ?? []); });
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const toggle = useCallback(async (mentor: MentorCardData | { userId: string }) => {
    const id = mentor.userId;
    if (pending.has(id)) return;
    const wasSaved = ids.has(id);
    // خوش‌بینانه
    setPending((p) => new Set(p).add(id));
    setIds((s) => { const n = new Set(s); if (wasSaved) n.delete(id); else n.add(id); return n; });
    if ("name" in mentor) {
      setCards((c) => (c === null ? c : wasSaved ? c.filter((m) => m.userId !== id) : [mentor as MentorCardData, ...c.filter((m) => m.userId !== id)]));
    }
    const revert = () => {
      setIds((s) => { const n = new Set(s); if (wasSaved) n.add(id); else n.delete(id); return n; });
      reload();
    };
    try {
      const res = await fetch(`/api/mentors/${encodeURIComponent(id)}/saved`, { method: wasSaved ? "DELETE" : "PUT" });
      if (!res.ok) {
        revert();
        showToast(await readApiError(res, wasSaved ? "از ذخیره‌شده‌ها برداشته نشد؛ دوباره تلاش کن" : "ذخیره نشد؛ دوباره تلاش کن"));
        return;
      }
      showToast(wasSaved ? "از ذخیره‌شده‌ها برداشته شد" : "به ذخیره‌شده‌ها اضافه شد");
      // کارتِ کامل برای تبِ ذخیره‌شده‌ها وقتی از پروفایل ذخیره شده
      if (!wasSaved && !("name" in mentor)) reload();
    } catch {
      revert();
      showToast(NETWORK_ERROR);
    } finally {
      setPending((p) => { const n = new Set(p); n.delete(id); return n; });
    }
  }, [ids, pending, reload, showToast]);

  const value = useMemo<Ctx>(() => ({
    cards, ids, max, error, reload, toggle,
    isSaved: (u) => ids.has(u),
    busy: (u) => pending.has(u),
  }), [cards, ids, max, error, reload, toggle, pending]);

  return (
    <SavedCtx.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="mentor-toast-wrap" aria-live="polite" role="status">
            <AnimatePresence>
              {toast && (
                <motion.div
                  key={toast.id}
                  className="mentor-toast"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: mT(M_DUR.base) }}
                  exit={{ opacity: 0, y: 4, transition: mT(M_DUR.fast) }}
                >
                  {toast.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </SavedCtx.Provider>
  );
}

/**
 * دکمه‌ی نشانک (ذخیره/برداشتن). بدونِ Provider چیزی رندر نمی‌کند. فشار: scaleِ
 * کوتاه (کلاسِ m-press)، و آیکون هنگامِ ذخیره با یک پرشدگیِ نرم عوض می‌شود.
 */
export function MentorSaveButton({ mentor, size = 16, className }: { mentor: MentorCardData | { userId: string; name?: string }; size?: number; className?: string }) {
  const ctx = useSavedMentors();
  if (!ctx) return null;
  const saved = ctx.isSaved(mentor.userId);
  const name = "name" in mentor && mentor.name ? mentor.name : "این منتور";
  return (
    <button
      type="button"
      className={`trade-icon-btn m-press mentor-save-btn${saved ? " is-on" : ""}${className ? ` ${className}` : ""}`}
      aria-pressed={saved}
      aria-label={saved ? `برداشتن ${name} از ذخیره‌شده‌ها` : `ذخیره‌ی ${name}`}
      title={saved ? "برداشتن از ذخیره‌شده‌ها" : "ذخیره برای بعد"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); ctx.toggle(mentor as MentorCardData); }}
    >
      <motion.span
        key={saved ? "on" : "off"}
        className="mentor-save-icon"
        initial={{ scale: 0.8, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1, transition: mT(M_DUR.base) }}
      >
        <Bookmark size={size} strokeWidth={1.75} fill={saved ? "currentColor" : "none"} aria-hidden />
      </motion.span>
    </button>
  );
}
