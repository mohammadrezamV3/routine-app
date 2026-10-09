"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Trash2 } from "lucide-react";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { Spinner } from "@/components/Spinner";
import { tr, isEn } from "@/lib/i18n";

// پنجره‌ی عکس پروفایل (وقتی عکس دارد و کاربر روی آواتار می‌زند): پیش‌نمایش
// بزرگ عکس فعلی + «عکس جدید» و «حذف». حذف دو مرحله‌ای‌ه — بار اول همون
// ردیف به سوال تایید تبدیل می‌شه، تا یک لمس اشتباهی عکس رو پاک نکنه.
// جای دکمه‌ی متنی کوچیک «حذف عکس پروفایل» زیر بنر رو گرفت.

type Props = {
  avatarUrl: string;
  busy: boolean;
  onPickNew: () => void;
  onDelete: () => Promise<void> | void;
  onClose: () => void;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function AvatarSheet({ avatarUrl, busy, onPickNew, onDelete, onClose }: Props) {
  useLockBodyScroll();
  const [mounted, setMounted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;
  return createPortal(
    <>
      <div className="modal-overlay open" onClick={busy ? undefined : onClose} />
      <div className="modal-panel open avatar-sheet" role="dialog" aria-modal="true" aria-label={tr("عکس پروفایل", "Profile photo")} dir={isEn() ? "ltr" : "rtl"}>
        <motion.div
          className="avatar-sheet-photo"
          initial={{ scale: 0.86, opacity: 0 }}
          animate={{ scale: confirming ? 0.92 : 1, opacity: confirming ? 0.55 : 1 }}
          transition={{ duration: 0.32, ease: EASE }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt={tr("عکس پروفایل", "Profile photo")} />
        </motion.div>

        <div className="avatar-sheet-actions">
          <AnimatePresence mode="wait" initial={false}>
            {confirming ? (
              <motion.div
                key="confirm" className="avatar-sheet-confirm"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: EASE }}
              >
                <div className="avatar-sheet-q">{tr("عکس پروفایل حذف بشه؟", "Delete your profile photo?")}</div>
                <div className="avatar-sheet-row">
                  <button type="button" className="account-outline-btn muted" onClick={() => setConfirming(false)} disabled={busy}>
                    {tr("نه", "No")}
                  </button>
                  <button type="button" className="account-outline-btn trade-danger-btn" onClick={() => onDelete()} disabled={busy}>
                    {busy ? <Spinner size={14} /> : <Trash2 size={14} />} {tr("حذف کن", "Delete")}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="main" className="avatar-sheet-row"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: EASE }}
              >
                <button type="button" className="account-outline-btn" onClick={onPickNew} disabled={busy}>
                  <ImagePlus size={15} /> {tr("عکس جدید", "New photo")}
                </button>
                <button type="button" className="account-outline-btn trade-danger-btn" onClick={() => setConfirming(true)} disabled={busy}>
                  <Trash2 size={14} /> {tr("حذف", "Delete")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>,
    document.body,
  );
}
