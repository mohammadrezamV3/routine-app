"use client";

// ردیفِ پایینِ بنتو: مربی‌ها، رودمپ‌ها و صندوقِ اعلان‌ها/اطلاعیه‌ها.
// متنِ پیام‌های منتور هیچ‌وقت این‌جا نیست (رمزگذاریِ سرتاسری) — فقط شمارش.

import Link from "next/link";
import { motion } from "framer-motion";
import { faNum } from "@/lib/jalali";
import type { DashboardData, DashMentors, DashRoadmap } from "@/lib/dashboardTypes";
import { BentoCard, CardHead, CountUp, EmptyState, LockedState, Meter, Skel } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";

export function DashboardMentors({ m, loading }: { m: DashMentors | null; loading: boolean }) {
  return (
    <BentoCard area="mentor" className="db-mentor" label="مربی‌ها">
      <CardHead icon="mentors" title="مربی‌ها" href="/mentorship" hrefLabel="مربی‌های من" />
      {loading ? (
        <Skel w="100%" h={90} r={12} />
      ) : !m ? null : m.activeAsStudent + m.activeAsMentor + m.pendingIncoming === 0 && !m.isMentor ? (
        <EmptyState icon="mentors" text="با یه مربی، برنامه‌ت رو حرفه‌ای‌تر پیش ببر." href="/mentors" cta="پیدا کردنِ مربی" />
      ) : (
        <div className="db-mentor-body">
          <Link href="/mentorship" prefetch className={`db-unread${m.unread ? " has" : ""}`}>
            <span className="db-unread-icon"><DashIcon name="chat" className="dbi-live" /></span>
            <span className="db-unread-text">
              <b>{m.unread ? <CountUp value={m.unread} /> : "بدونِ"}</b> پیامِ خوانده‌نشده
            </span>
          </Link>
          <div className="db-mini-stats">
            <Link href="/mentorship" prefetch><b>{faNum(m.activeAsStudent)}</b><span>مربیِ فعال</span></Link>
            {m.isMentor && <Link href="/mentor" prefetch><b>{faNum(m.activeAsMentor)}</b><span>شاگرد</span></Link>}
            <Link href={m.isMentor ? "/mentor" : "/mentorship"} prefetch className={m.pendingIncoming ? "is-alert" : ""}><b>{faNum(m.pendingIncoming)}</b><span>درخواستِ منتظر</span></Link>
          </div>
        </div>
      )}
    </BentoCard>
  );
}

export function DashboardRoadmaps({ r, loading, locked }: { r: { items: DashRoadmap[]; total: number } | null; loading: boolean; locked: boolean }) {
  return (
    <BentoCard area="road" className="db-road" label="رودمپ‌ها">
      <CardHead icon="roadmap" title="رودمپ‌های یادگیری" href="/roadmaps" hrefLabel="همه" />
      {loading ? (
        <Skel w="100%" h={90} r={12} />
      ) : locked ? (
        <LockedState title="رودمپِ یادگیری" />
      ) : !r ? null : r.items.length === 0 ? (
        <EmptyState icon="spark" text="هر مهارتی رو بگو، هوش مصنوعی قدم‌به‌قدم مسیرش رو می‌سازه." href="/roadmaps/new" cta="ساختِ رودمپ" />
      ) : (
        <ul className="db-road-list">
          {r.items.map((it, i) => (
            <li key={it.id}>
              <Link href={`/roadmaps/custom/${it.id}`} prefetch className="db-road-item">
                <span className="db-road-head">
                  <span className="db-road-title">{it.title || it.topic}</span>
                  <b>{faNum(it.pct)}٪</b>
                </span>
                <Meter value={it.pct / 100} delay={0.3 + i * 0.08} />
                <span className="db-road-sub">{faNum(it.done)} از {faNum(it.total)} مرحله</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BentoCard>
  );
}

function ago(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "همین الان";
  if (min < 60) return `${faNum(min)} دقیقه پیش`;
  const h = Math.round(min / 60);
  if (h < 24) return `${faNum(h)} ساعت پیش`;
  return `${faNum(Math.round(h / 24))} روز پیش`;
}

export function DashboardInbox({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const ann = data?.announcements ?? [];
  const notes = data?.notifications.latest ?? [];
  return (
    <BentoCard area="inbox" className="db-inbox" label="اعلان‌ها">
      <CardHead icon="bell" title="اعلان‌ها" extra={data?.notifications.unread ? <span className="db-pill is-accent">{faNum(data.notifications.unread)} تازه</span> : null} href="/account/notifications" hrefLabel="تنظیمات" />
      {loading ? (
        <Skel w="100%" h={90} r={12} />
      ) : ann.length === 0 && notes.length === 0 ? (
        <EmptyState icon="bell" text="همه‌چیز آرومه — اعلانِ تازه‌ای نداری." />
      ) : (
        <ul className="db-inbox-list">
          {ann.map((a) => (
            <motion.li key={a.id} className="db-note is-ann" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <span className="db-note-icon"><DashIcon name="spark" /></span>
              <span className="db-note-body"><b>{a.title}</b><span>{a.body}</span></span>
            </motion.li>
          ))}
          {notes.slice(0, Math.max(0, 4 - ann.length)).map((n) => {
            const inner = (
              <>
                <span className="db-note-icon"><DashIcon name={n.type.startsWith("message") || n.type.includes("mentor") ? "chat" : "bell"} /></span>
                <span className="db-note-body"><b>{n.title}</b><span>{n.body}</span></span>
                <time className="db-note-time">{ago(n.createdAt)}</time>
              </>
            );
            return (
              <motion.li key={n.id} className={`db-note${n.read ? "" : " is-unread"}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                {n.url && n.url.startsWith("/") ? <Link href={n.url} prefetch={false} className="db-note-link">{inner}</Link> : <div className="db-note-link">{inner}</div>}
              </motion.li>
            );
          })}
        </ul>
      )}
    </BentoCard>
  );
}

