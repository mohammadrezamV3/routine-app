"use client";

import "./mentor.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { ChevronRight, Lock } from "lucide-react";
import { AuthGate } from "./AuthGate";
import { FeatureGate } from "./FeatureGate";
import { LoadingBlock } from "./Spinner";
import { MentorErrorState } from "./MentorPageShell";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { MentorKebabMenu, type MentorMenuAction } from "./MentorKebabMenu";
import { MentorChat, type ChatSheet } from "./MentorChat";
import { useMentorshipActions } from "./MentorshipActions";
import { useMentorshipRelation } from "./useMentorshipRelation";
import { M_DUR, mT } from "./MentorMotion";
import { publicUserName } from "@/lib/mentorTypes";
import { fmtDate } from "@/lib/mentorFormat";
import { GoldenName } from "@/components/GoldenName";

/**
 * صفحه‌ی گفت‌وگو (/mentorship/[id]/chat) — یک صفحه‌ی کامل مثل پیام‌رسان‌ها:
 * سر شناور شیشه‌ای (بازگشت، نام + وضعیت، منوی سه‌نقطه، آواتار)، رشته‌ی پیام‌ها
 * لبه‌به‌لبه و نوار نوشتن شناور پایین صفحه.
 *
 * به body پورتال می‌شود (بیرون از template که transform دارد) و تا وقتی باز
 * است نوار بالای سایت پنهان می‌ماند. ارتفاع از visualViewport خوانده
 * می‌شود تا با باز شدن کیبورد موبایل نوار نوشتن بالای کیبورد بماند.
 * بک‌گراند تازه ندارد: پس‌زمینه‌ی خود سایت پشت پیام‌ها دیده می‌شود.
 */
export function MentorChatScreen({ id }: { id: string }) {
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    root.classList.add("mc-open");
    return () => root.classList.remove("mc-open");
  }, []);

  // صفحه‌ی زیرین تا وقتی گفت‌وگو بازه غیرفعاله (inert) و فوکوس میاد داخل گفت‌وگو
  useEffect(() => {
    if (!mounted) return;
    const screen = screenRef.current;
    if (!screen) return;
    const opener = document.activeElement as HTMLElement | null;
    const touched: Element[] = [];
    for (const el of Array.from(document.body.children)) {
      if (el === screen || el.tagName === "SCRIPT" || el.hasAttribute("inert")) continue;
      el.setAttribute("inert", "");
      touched.push(el);
    }
    screen.focus({ preventScroll: true });
    return () => {
      touched.forEach((el) => el.removeAttribute("inert"));
      if (opener && document.contains(opener)) opener.focus?.({ preventScroll: true });
    };
  }, [mounted]);

  // کیبورد موبایل: ارتفاع و جای صفحه = viewport دیدنی
  useEffect(() => {
    const vv = window.visualViewport;
    const el = screenRef.current;
    if (!vv || !el) return;
    const sync = () => {
      el.style.height = `${vv.height}px`;
      el.style.top = `${vv.offsetTop}px`;
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => { vv.removeEventListener("resize", sync); vv.removeEventListener("scroll", sync); };
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <motion.div
      ref={screenRef}
      className="mc-screen"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="گفت‌وگو"
      tabIndex={-1}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0, transition: mT(M_DUR.slow) }}
    >
      {status === "loading" && <div className="mc-state"><LoadingBlock /></div>}
      {status === "unauthenticated" && <div className="mc-state"><AuthGate message="برای استفاده از بخش مربی‌ها وارد شو" /></div>}
      {status === "authenticated" && (
        <FeatureGate feature="mentors">
          <ChatScreenBody id={id} />
        </FeatureGate>
      )}
    </motion.div>,
    document.body
  );
}

function ChatScreenBody({ id }: { id: string }) {
  const { rel, error, reload } = useMentorshipRelation(id);
  const [sheet, setSheet] = useState<ChatSheet>(null);
  const [ready, setReady] = useState(false);
  const [wantReport, setWantReport] = useState(false);
  const onReady = useCallback((r: boolean) => setReady(r), []);

  // ?report=1 (از منوی صفحه‌ی رابطه): پنل گزارش پس از آماده شدن پیام‌ها
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("report") === "1") {
      setWantReport(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("report");
      window.history.replaceState(null, "", url.toString());
    }
  }, []);
  useEffect(() => {
    if (wantReport && ready) { setSheet("report"); setWantReport(false); }
  }, [wantReport, ready]);

  const { actions, dialogs } = useMentorshipActions({
    rel,
    onChanged: reload,
    onReportConversation: () => (ready ? setSheet("report") : setWantReport(true)),
  });
  const menu: MentorMenuAction[] = [
    ...actions,
  ];

  const name = rel ? publicUserName(rel.row.counterpart) : "";
  const chatOpen = rel && (rel.row.status === "ACTIVE" || rel.row.status === "ENDED");
  const away = rel?.role === "student" && rel.row.mentorAway ? rel.row.mentorAway : null;
  const statusLine = !rel ? ""
    : rel.row.status === "ENDED" ? "همکاری تموم شده"
    : rel.row.status === "PENDING" ? "منتظر جواب"
    : rel.row.pausedAt ? "همکاری فعلا نگه داشته شده"
    : away ? `تا ${fmtDate(away.until)} در دسترس نیست`
    : rel.role === "student" ? "مربی تو" : "شاگرد تو";

  return (
    <>
      <header className="mc-head">
        <Link href={`/mentorship/${id}`} className="mc-pill mc-circle" aria-label="برگشت">
          <ChevronRight size={22} strokeWidth={1.75} aria-hidden />
        </Link>
        {rel ? (
          <Link href={`/mentorship/${id}`} className="mc-pill mc-title" aria-label={`${name}؛ صفحه‌ی همکاری`}>
            <b><GoldenName golden={rel?.row.counterpart.golden} staff={rel?.row.counterpart.staff}>{name}</GoldenName></b>
            <span>{statusLine}</span>
          </Link>
        ) : (
          <span className="mc-pill mc-title is-empty" aria-hidden />
        )}
        <div className="mc-head-end">
          {chatOpen && (
            <button type="button" className="mc-pill mv2-ms-lockpill" onClick={() => setSheet("e2ee")} disabled={!ready} aria-haspopup="dialog" aria-label="خصوصی؛ امنیت گفت‌وگو">
              <Lock size={14} strokeWidth={2} aria-hidden /> خصوصی
            </button>
          )}
          {rel && <MentorKebabMenu actions={menu} className="mc-pill mc-circle mc-kebab" iconSize={18} label="گزینه‌های گفت‌وگو" />}
          {rel ? (
            <Link href={`/mentorship/${id}`} className="mc-avatar" aria-hidden tabIndex={-1}>
              <MentorUserAvatar name={name} avatarUrl={rel.row.counterpart.avatarUrl} size={42} />
            </Link>
          ) : <span className="mc-avatar" />}
        </div>
      </header>

      <main className="mc-main">
        {error ? (
          <div className="mc-state"><MentorErrorState message={error.msg} onRetry={error.retry ? reload : undefined} /></div>
        ) : !rel ? (
          <div className="mc-state"><LoadingBlock /></div>
        ) : chatOpen ? (
          <MentorChat mentorshipId={id} peerName={name} sheet={sheet} onSheetClose={() => setSheet(null)} onOpenSheet={setSheet} onReady={onReady} />
        ) : (
          <div className="mc-state"><p className="mc-empty">{rel.row.status === "PENDING" ? "گفت‌وگو بعد از قبول شدن درخواست باز می‌شه" : "این همکاری گفت‌وگو نداره"}</p></div>
        )}
      </main>
      {dialogs}
    </>
  );
}
