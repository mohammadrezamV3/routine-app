"use client";

// ردیف پایین بنتو: مربی‌ها، رودمپ‌ها و صندوق اعلان‌ها/اطلاعیه‌ها.
// متن پیام‌های منتور هیچ‌وقت این‌جا نیست (رمزگذاری سرتاسری) — فقط شمارش.

import Link from "next/link";
import { motion } from "framer-motion";
import { faNum } from "@/lib/jalali";
import type { DashboardData, DashMentors, DashRoadmap } from "@/lib/dashboardTypes";
import { BentoCard, CardHead, CountUp, EmptyState, Meter, Skel } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";
import { tr } from "@/lib/i18n";

export function DashboardMentors({ m, loading }: { m: DashMentors | null; loading: boolean }) {
  return (
    <BentoCard area="mentor" className="db-mentor" label={tr("مربی‌ها", "Mentors")}>
      <CardHead icon="mentors" title={tr("مربی‌ها", "Mentors")} href="/mentorship" hrefLabel={tr("مربی‌های من", "My mentors")} />
      {loading ? (
        <Skel w="100%" h={90} r={12} />
      ) : !m ? null : m.activeAsStudent + m.activeAsMentor + m.pendingIncoming === 0 && !m.isMentor ? (
        <EmptyState icon="mentors" text={tr("با یه مربی، برنامه‌ت رو حرفه‌ای‌تر پیش ببر.", "Take your routine further with a mentor.")} href="/mentors" cta={tr("پیدا کردن مربی", "Find a mentor")} />
      ) : (
        <div className="db-mentor-body">
          <Link href="/mentorship" prefetch className={`db-unread${m.unread ? " has" : ""}`}>
            <span className="db-unread-icon"><DashIcon name="chat" className="dbi-live" /></span>
            <span className="db-unread-text">
              <b>{m.unread ? <CountUp value={m.unread} /> : tr("بدون", "No")}</b> {tr("پیام خوانده‌نشده", m.unread === 1 ? "unread message" : "unread messages")}
            </span>
          </Link>
          <div className="db-mini-stats">
            <Link href="/mentorship" prefetch><b>{faNum(m.activeAsStudent)}</b><span>{tr("مربی فعال", "Active mentors")}</span></Link>
            {m.isMentor && <Link href="/mentor" prefetch><b>{faNum(m.activeAsMentor)}</b><span>{tr("شاگرد", "Students")}</span></Link>}
            <Link href={m.isMentor ? "/mentor" : "/mentorship"} prefetch className={m.pendingIncoming ? "is-alert" : ""}><b>{faNum(m.pendingIncoming)}</b><span>{tr("درخواست منتظر", "Pending requests")}</span></Link>
          </div>
        </div>
      )}
    </BentoCard>
  );
}

export function DashboardRoadmaps({ r, loading }: { r: { items: DashRoadmap[]; total: number } | null; loading: boolean }) {
  return (
    <BentoCard area="road" className="db-road" label={tr("رودمپ‌ها", "Roadmaps")}>
      <CardHead icon="roadmap" title={tr("رودمپ‌های یادگیری", "Learning roadmaps")} href="/roadmaps" hrefLabel={tr("همه", "All")} />
      {loading ? (
        <Skel w="100%" h={90} r={12} />
      ) : !r ? null : r.items.length === 0 ? (
        <EmptyState icon="spark" text={tr("هر مهارتی رو بگو، هوش مصنوعی قدم‌به‌قدم مسیرش رو می‌سازه.", "Name any skill and AI builds the path step by step.")} href="/roadmaps/new" cta={tr("ساخت رودمپ", "Create roadmap")} />
      ) : (
        <ul className="db-road-list">
          {r.items.map((it, i) => (
            <li key={it.id}>
              <Link href={`/roadmaps/custom/${it.id}`} prefetch className="db-road-item">
                <span className="db-road-head">
                  <span className="db-road-title">{it.title || it.topic}</span>
                  <b>{faNum(it.pct)}{tr("٪", "%")}</b>
                </span>
                <Meter value={it.pct / 100} delay={0.3 + i * 0.08} />
                <span className="db-road-sub">{tr(`${faNum(it.done)} از ${faNum(it.total)} مرحله`, `${it.done} of ${it.total} steps`)}</span>
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
  if (min < 1) return tr("همین الان", "Just now");
  if (min < 60) return tr(`${faNum(min)} دقیقه پیش`, `${min} min ago`);
  const h = Math.round(min / 60);
  if (h < 24) return tr(`${faNum(h)} ساعت پیش`, `${h} ${h === 1 ? "hour" : "hours"} ago`);
  const dd = Math.round(h / 24);
  return tr(`${faNum(dd)} روز پیش`, `${dd} ${dd === 1 ? "day" : "days"} ago`);
}

export function DashboardInbox({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const ann = data?.announcements ?? [];
  const notes = data?.notifications.latest ?? [];
  return (
    <BentoCard area="inbox" className="db-inbox" label={tr("اعلان‌ها", "Notifications")}>
      <CardHead icon="bell" title={tr("اعلان‌ها", "Notifications")} extra={data?.notifications.unread ? <span className="db-pill is-accent">{tr(`${faNum(data.notifications.unread)} تازه`, `${data.notifications.unread} new`)}</span> : null} href="/account/notifications" hrefLabel={tr("تنظیمات", "Settings")} />
      {loading ? (
        <Skel w="100%" h={90} r={12} />
      ) : ann.length === 0 && notes.length === 0 ? (
        <EmptyState icon="bell" text={tr("همه‌چیز آرومه — اعلان تازه‌ای نداری.", "All quiet — no new notifications.")} />
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

