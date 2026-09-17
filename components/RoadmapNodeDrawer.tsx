"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { BookOpen, Check, ExternalLink, Lock, X } from "lucide-react";
import { LockBodyScroll } from "./LockBodyScroll";
import { faNum } from "@/lib/jalali";
import { NodeProgress, NodeStatus, RoadmapNode, isNodeUnlocked } from "@/lib/roadmapGraph";

// جزئیاتِ یک نود — همان الگوی کشوی جزئیاتِ معامله (trade-drawer)، نه یک
// پوسته‌ی تازه: روی موبایل از پایین می‌آید و روی دسکتاپ از کنار.

const LEVEL_LABEL: Record<string, string> = {
  beginner: "مقدماتی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
};

const TYPE_LABEL: Record<string, string> = {
  article: "مقاله",
  documentation: "مستندات",
  video: "ویدیو",
  course: "دوره",
  lab: "تمرینِ عملی",
  book: "کتاب",
};

const STATUS_LABEL: Record<NodeStatus, string> = {
  not_started: "شروع نشده",
  in_progress: "در حال انجام",
  completed: "تمام شد",
};

/** منبعِ بدونِ لینکِ معتبر به یک جست‌وجوی واقعی تبدیل می‌شود، نه یک لینکِ ساختگی. */
function searchUrl(query: string, topic: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} ${topic}`)}`;
}

export function RoadmapNodeDrawer({
  node, topic, progress, nodeTitleById, onClose, onStatus, busy,
}: {
  node: RoadmapNode;
  topic: string;
  progress: NodeProgress;
  nodeTitleById: Map<string, string>;
  onClose: () => void;
  onStatus: (status: NodeStatus) => void;
  busy: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const status = progress[node.id] || "not_started";
  const unlocked = isNodeUnlocked(node, progress);

  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={onClose} />
      <div className="trade-drawer open rmg-drawer" role="dialog" aria-modal="true">
        <div className="trade-drawer-head">
          <div>
            <div className="modal-eyebrow">{LEVEL_LABEL[node.level] || node.level}</div>
            <div className="modal-title">{node.title}</div>
          </div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن"><X size={16} /></button>
        </div>

        {node.description && <p className="rmg-drawer-desc">{node.description}</p>}

        <div className="trade-detail-grid">
          <div className="trade-detail-cell">
            <span>زمان تخمینی</span>
            <b>{node.estimatedHours > 0 ? `${faNum(node.estimatedHours)} ساعت` : "—"}</b>
          </div>
          <div className="trade-detail-cell">
            <span>وضعیت</span>
            <b>{STATUS_LABEL[status]}</b>
          </div>
        </div>

        {!!node.prerequisites.length && (
          <div className="trade-detail-section">
            <div className="trade-detail-section-title">پیش‌نیازها</div>
            <ul className="rmg-prereq-list">
              {node.prerequisites.map((p) => {
                const done = progress[p] === "completed";
                return (
                  <li key={p} className={done ? "done" : undefined}>
                    {done ? <Check size={12} /> : <Lock size={11} />}
                    {nodeTitleById.get(p) || p}
                  </li>
                );
              })}
            </ul>
            {!unlocked && (
              <div className="rmg-locked-note">
                هنوز همه‌ی پیش‌نیازها تمام نشده — می‌تونی شروع کنی، ولی احتمالاً سخت‌تر پیش می‌ره.
              </div>
            )}
          </div>
        )}

        {!!node.topics.length && (
          <div className="trade-detail-section">
            <div className="trade-detail-section-title">سرفصل‌ها</div>
            <ul className="rmg-bullets">
              {node.topics.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}

        {!!node.tasks.length && (
          <div className="trade-detail-section">
            <div className="trade-detail-section-title">تمرینِ عملی</div>
            <ul className="rmg-bullets task">
              {node.tasks.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}

        {!!node.resources.length && (
          <div className="trade-detail-section">
            <div className="trade-detail-section-title">منابع</div>
            <div className="rmg-resources">
              {node.resources.map((r, i) => (
                <a
                  key={i}
                  className="rmg-resource"
                  // لینکِ بدونِ اعتبار اصلاً ذخیره نشده؛ به‌جایش جست‌وجوی همان عنوان
                  href={r.url || searchUrl(r.title, topic)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BookOpen size={13} />
                  <span className="rmg-resource-body">
                    <b>{r.title}</b>
                    <em>
                      {TYPE_LABEL[r.type] || r.type}
                      {r.source ? ` · ${r.source}` : ""}
                      {r.url ? "" : " · جست‌وجو"}
                    </em>
                  </span>
                  <ExternalLink size={11} />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="rmg-status-actions">
          {(["not_started", "in_progress", "completed"] as NodeStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`rmg-status-btn${status === s ? " on" : ""}`}
              onClick={() => onStatus(s)}
              disabled={busy}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
}
