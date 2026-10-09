"use client";

import "./mentor.css";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { MentorCard as MentorCardData } from "@/lib/mentorTypes";
import { MentorCard } from "./MentorCard";
import { MentorSectionTitle } from "./MentorUI";
import { MentorStaggerItem } from "./MentorMotion";
import { tr } from "@/lib/i18n";

/** حداکثر کارت در هر ردیف؛ بقیه با «مشاهده همه» */
export const CAROUSEL_LIMIT = 10;

// یک ردیف افقی کشف (محبوب/تازه/هر حوزه): عنوان راست، «مشاهده همه» چپ؛
// کارت‌ها با لمس اسکرول می‌شوند و با ماوس هم می‌شود کشید (drag). بعد از
// چند کارت، یک خانه‌ی «مشاهده همه ←» ته ردیف می‌آید.
export function MentorCarousel({
  title, icon, note, mentors, onViewAll,
}: {
  title: string;
  icon?: React.ReactNode;
  note?: string;
  mentors: MentorCardData[];
  onViewAll: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  useDragScroll(rowRef);
  const shown = mentors.slice(0, CAROUSEL_LIMIT);

  return (
    <section className="trade-surface mentor-box mentor-carousel" aria-label={title}>
      <MentorSectionTitle
        icon={icon}
        action={
          <button type="button" className="mentor-text-btn" onClick={onViewAll}>
            {tr("مشاهده همه", "View all")} <ArrowLeft size={14} strokeWidth={1.75} aria-hidden className="dir-flip" />
          </button>
        }
      >
        {title}
      </MentorSectionTitle>
      {note && <p className="mentor-muted mentor-section-note">{note}</p>}
      {/* خود ردیف والد پله‌ها است (همان کار MentorStagger، با ref برای کشیدن) */}
      <motion.div className="mentor-popular-row mentor-carousel-row" ref={rowRef} initial="hidden" animate="show" variants={{ hidden: {}, show: {} }}>
        {shown.map((m, i) => (
          <MentorStaggerItem key={m.userId} index={i} className="mentor-grid-item">
            <MentorCard mentor={m} />
          </MentorStaggerItem>
        ))}
        <MentorStaggerItem index={shown.length} className="mentor-grid-item">
          <button type="button" className="mentor-carousel-more" onClick={onViewAll}>
            <span className="mentor-carousel-more-icon"><ArrowLeft size={18} strokeWidth={1.75} aria-hidden className="dir-flip" /></span>
            {tr("مشاهده همه", "View all")}
          </button>
        </MentorStaggerItem>
      </motion.div>
    </section>
  );
}

/**
 * کشیدن افقی با ماوس. لمس همان اسکرول بومی مرورگر است (دست نمی‌زنیم).
 * اگر ماوس بیشتر از چند پیکسل جابه‌جا شد، کلیک بعدی (روی لینک کارت) خنثی
 * می‌شود تا کشیدن باعث ورود به پروفایل نشود.
 */
function useDragScroll(ref: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let down = false;
    let moved = false;
    let startX = 0;
    let startScroll = 0;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        el.classList.add("is-dragging");
      }
      if (moved) el.scrollLeft = startScroll - dx;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      el.classList.remove("is-dragging");
    };
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClick, true);
    };
  }, [ref]);
}
