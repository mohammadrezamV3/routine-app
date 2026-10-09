"use client";

// سرفصل فصل‌های داده (نقشه، خواب): همون ظاهر Chapter ولی شماره‌ی فصل اختیاریه
// (فصل‌هایی که پشت فلگ یا بی‌داده پنهان می‌شن شماره‌ی ثابت ندارن).
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { tr } from "@/lib/i18n";
import { Reveal, WL_EASE, useLite } from "./WeeklyLetterShared";
import "./weekly-letter.css";

export function WeeklyLetterChapterHead({ icon: Icon, title, no }: { icon: LucideIcon; title: string; no?: number }) {
  const lite = useLite();
  return (
    <Reveal className="wl-ch-head">
      <span className="wl-ch-badge" aria-hidden="true"><Icon size={19} /></span>
      <span className="wl-ch-txt">
        {no ? <span className="wl-ch-k" aria-hidden="true">{tr("فصل", "Chapter")} {String(no).padStart(2, "0")}</span> : null}
        <h2 className="wl-ch-title">{title}</h2>
      </span>
      <motion.span
        className="wl-ch-line"
        aria-hidden="true"
        initial={{ scaleX: lite ? 1 : 0, opacity: lite ? 0 : 1 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true, margin: "0px 0px -8% 0px" }}
        transition={{ duration: lite ? 0.25 : 1.1, ease: WL_EASE as never, delay: lite ? 0 : 0.25 }}
      />
    </Reveal>
  );
}
