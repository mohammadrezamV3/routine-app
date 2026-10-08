"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Globe } from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { InstagramIcon, TelegramIcon } from "@/components/SocialIcons";
import { TEAM_LINK_KINDS, type TeamLinkKind, type TeamMember } from "@/lib/teamMembers";

// پنل اعضای تیم Arion Group در صفحه‌ی درباره. با زدن کارت «سازنده» باز
// می‌شه (AboutContact)؛ ترتیب اعضا همون ترتیبیه که ادمین در /admin/team
// چیده. بک‌گراند فقط از کلاس کارت خود صفحه (.ab-contact-card) میاد.

function Linkedin({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.8v1.54h.05c.53-1 1.82-2.04 3.75-2.04 4 0 4.75 2.63 4.75 6.05V21h-4v-4.9c0-1.17-.02-2.67-1.63-2.67-1.63 0-1.88 1.27-1.88 2.58V21h-4V9.75Z" />
    </svg>
  );
}

const LINK_META: Record<TeamLinkKind, { label: string; icon: (s: number) => React.ReactNode }> = {
  telegram: { label: "تلگرام", icon: (s) => <TelegramIcon size={s} /> },
  instagram: { label: "اینستاگرام", icon: (s) => <InstagramIcon size={s} /> },
  linkedin: { label: "لینکدین", icon: (s) => <Linkedin size={s} /> },
  website: { label: "وب‌سایت", icon: (s) => <Globe size={s} /> },
};

export function TeamMemberAvatar({ member, size, className = "ab-team-photo" }: { member: Pick<TeamMember, "name" | "photo">; size: number; className?: string }) {
  if (member.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={member.photo} alt="" width={size} height={size} className={className} style={{ width: size, height: size }} />;
  }
  return <AgentAvatar seed={member.name || "member"} size={size} className={className} aria-hidden="true" />;
}

export function AboutTeamPanel({ open, members, id }: { open: boolean; members: TeamMember[]; id: string }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          id={id}
          key="team"
          className="ab-team-wrap"
          initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <ul className="ab-team" aria-label="اعضای تیم Arion Group">
            {members.map((m, i) => (
              <motion.li
                key={m.id}
                className="ab-contact-card ab-team-card"
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: reduce ? 0 : 0.08 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <TeamMemberAvatar member={m} size={72} />
                {m.roles.length > 0 && (
                  <ul className="ab-team-roles" aria-label="عنوان‌ها">
                    {m.roles.map((r) => <li key={r} className="ab-team-role">{r}</li>)}
                  </ul>
                )}
                <div className="ab-team-name">{m.name}</div>
                {m.bio && <p className="ab-team-bio" dir="auto">{m.bio}</p>}
                <div className="ab-team-links">
                  {TEAM_LINK_KINDS.filter((k) => m.links[k]).map((k) => (
                    <a
                      key={k}
                      href={m.links[k]}
                      target="_blank"
                      rel="me noopener noreferrer"
                      className="ab-team-link"
                      aria-label={`${LINK_META[k].label} ${m.name}`}
                      title={LINK_META[k].label}
                    >
                      {LINK_META[k].icon(16)}
                    </a>
                  ))}
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
