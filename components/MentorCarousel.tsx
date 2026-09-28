"use client";

import "./mentor.css";
import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import type { MentorCard as MentorCardData } from "@/lib/mentorTypes";
import { MentorCard } from "./MentorCard";
import { MentorSectionTitle } from "./MentorUI";

/** حداکثر کارت در هر ردیف؛ بقیه با «مشاهده همه» */
export const CAROUSEL_LIMIT = 10;

// یک ردیفِ افقیِ کشف (محبوب/تازه/هر حوزه): عنوان راست، «مشاهده همه» چپ؛
// کارت‌ها با لمس اسکرول می‌شوند و با ماوس هم می‌شود کشید (drag). بعد از
// چند کارت، یک خانه‌ی «مشاهده همه ←» تهِ ردیف می‌آید.
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
    <div className="mentor-carousel" role="region" aria-label={title}>
      <MentorSectionTitle
        icon={icon}
        action={
          <button type="button" className="mentor-text-btn" onClick={onViewAll}>
            مشاهده همه <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
          </button>
        }
      >
        {title}
      </MentorSectionTitle>
      {note && <p className="mentor-muted mentor-section-note">{note}</p>}
      <div className="mentor-popular-row mentor-carousel-row" ref={rowRef}>
        {shown.map((m) => <MentorCard key={m.userId} mentor={m} />)}
        <button type="button" className="mentor-carousel-more" onClick={onViewAll}>
          <span className="mentor-carousel-more-icon"><ArrowLeft size={18} strokeWidth={1.75} aria-hidden /></span>
          مشاهده همه
        </button>
      </div>
    </div>
  );
}

/**
 * کشیدنِ افقی با ماوس. لمس همان اسکرولِ بومیِ مرورگر است (دست نمی‌زنیم).
 * اگر ماوس بیشتر از چند پیکسل جابه‌جا شد، کلیکِ بعدی (روی لینکِ کارت) خنثی
 * می‌شود تا کشیدن باعثِ ورود به پروفایل نشود.
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
