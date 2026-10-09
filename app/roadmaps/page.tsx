"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronLeft, Clock, Layers, Map, Plus, Trash2 } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { AuthGate } from "@/components/AuthGate";
import { RoadmapWizard } from "@/components/RoadmapWizard";
import { RoadmapDisclaimer } from "@/components/RoadmapDisclaimer";
import { LoadingBlock } from "@/components/Spinner";
import { RoadmapBuildStatus, BuildInfo } from "@/components/RoadmapBuildStatus";
import { MentorConfirmDialog } from "@/components/MentorConfirmDialog";
import { faNum } from "@/lib/jalali";
import { levelLabel } from "@/lib/roadmapPlan";
import { useLiveRefresh } from "@/lib/liveSync";
import { tr, pick } from "@/lib/i18n";

type RoadmapCard = {
  id: string;
  topic: string;
  title: string;
  summary: string | null;
  goal: string | null;
  totalDuration: string | null;
  level: string | null;
  stageCount: number;
  doneCount: number;
  pct: number;
  build: BuildInfo;
};

// چند موضوع نمونه برای حالت خالی — یک کلیک ویزارد را با همان موضوع باز
// می‌کند، تا کاربری که نمی‌داند چه بنویسد جلوی یک فیلد خالی نماند.
const SUGGESTIONS: { fa: string; en: string }[] = [
  { fa: "برنامه‌نویسی وب", en: "Web development" },
  { fa: "امنیت شبکه", en: "Network security" },
  { fa: "تحلیل داده با پایتون", en: "Data analysis with Python" },
  { fa: "طراحی UI/UX", en: "UI/UX design" },
  { fa: "زبان انگلیسی", en: "English language" },
  { fa: "ادیت ویدیو", en: "Video editing" },
];

export default function RoadmapsHub() {
  const { status } = useSession();
  const [roadmaps, setRoadmaps] = useState<RoadmapCard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [wizard, setWizard] = useState<{ topic: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (status !== "authenticated") { setLoaded(true); return; }
    fetch("/api/roadmaps")
      .then((r) => r.json())
      .then((res) => setRoadmaps(res.roadmaps || []))
      .catch(() => setRoadmaps([]))
      .finally(() => setLoaded(true));
  }, [status]);

  useEffect(() => { load(); }, [load]);
  // زنده: ساخت/حذف/پیشرفت رودمپ از هرجا (صفحه‌ی مسیر، تب دیگه) یا برگشت به تب
  useLiveRefresh("roadmaps", load);

  // تا وقتی رودمپی در حال ساخت است، لیست هر ۴ ثانیه تازه می‌شود تا پیشرفت
  // روی کارتش زنده دیده شود؛ بعد از آماده‌شدن همه، polling قطع می‌شود.
  const anyBuilding = roadmaps.some((r) => r.build?.status === "building");
  useEffect(() => {
    if (!anyBuilding) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [anyBuilding, load]);

  function openDeleteConfirm(e: React.MouseEvent, r: RoadmapCard) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteError(null);
    setDeleteTarget(r);
  }

  async function removeRoadmap() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/roadmaps/${deleteTarget.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setDeleting(false);
      setDeleteError(res ? tr("حذف نشد — دوباره امتحان کن", "Could not delete — please try again") : tr("ارتباط با سرور برقرار نشد — اتصال را چک کن", "Could not reach the server — check your connection"));
      return;
    }
    setDeleting(false);
    setDeleteTarget(null);
    load();
  }

  return (
    <section className="roadmaps-desktop rp-hub">
      <div className="trade-head-row">
        <h1>{tr("رودمپ‌ها", "Roadmaps")}</h1>
        {status === "authenticated" && (
          <button type="button" className="trade-title-add-btn" onClick={() => setWizard({ topic: "" })}>
            {tr("+ مسیر جدید", "+ New path")}
          </button>
        )}
      </div>

      {status === "authenticated" ? (
        <FeatureGate feature="roadmaps">
          {!loaded ? (
            <LoadingBlock />
          ) : !roadmaps.length ? (
            <div className="trade-surface rp-empty">
              <span className="rp-empty-icon"><Map size={26} /></span>
              <h2>{tr("اولین مسیرت رو بساز", "Build your first path")}</h2>
              <p>
                {tr(`بگو چی می‌خوای یاد بگیری و برای چی. یه مسیر مرحله‌به‌مرحله می‌گیری که هر مرحله‌ش سرفصل‌های ریز،
                کارهای عملی، پروژه، ابزار، منبع و معیار تموم‌شدن داره.`, "Tell us what you want to learn and why. You get a step-by-step path where every stage has detailed topics, practical tasks, a project, tools, resources and a finish line.")}
              </p>
              <div className="rp-empty-chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s.fa} type="button" className="rp-chip-btn" onClick={() => setWizard({ topic: pick(s) })}>
                    {pick(s)}
                  </button>
                ))}
              </div>
              <button type="button" className="trade-primary-btn rp-empty-cta" onClick={() => setWizard({ topic: "" })}>
                <Plus size={15} /> {tr("ساخت مسیر", "Create path")}
              </button>
            </div>
          ) : (
            <div className="trade-surface rp-grid-box">
              <div className="rp-grid">
                {roadmaps.map((r) => (
                  <Link key={r.id} href={`/roadmaps/custom/${r.id}`} className="trade-surface rp-card">
                    <div className="rp-card-head">
                      <div className="rp-card-eyebrow">{r.topic}</div>
                      <button
                        type="button"
                        className="trade-icon-btn danger rp-card-delete"
                        aria-label={tr("حذف مسیر", "Delete path")}
                        onClick={(e) => openDeleteConfirm(e, r)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="rp-card-title">{r.title}</div>
                    {r.summary && <p className="rp-card-desc">{r.summary}</p>}

                    <div className="rp-card-meta">
                      {r.totalDuration && <span><Clock size={12} /> {r.totalDuration}</span>}
                      {r.stageCount > 0 && <span><Layers size={12} /> {faNum(r.stageCount)} {tr("مرحله", r.stageCount === 1 ? "stage" : "stages")}</span>}
                      {levelLabel(r.level) && <span>{levelLabel(r.level)}</span>}
                    </div>

                    {r.build && r.build.status !== "ready" && <RoadmapBuildStatus build={r.build} compact />}

                    <div className="rp-card-foot">
                      <div className="rp-bar"><span style={{ width: `${r.pct}%` }} /></div>
                      <span className="rp-card-pct">{faNum(r.pct)}٪</span>
                      <ChevronLeft size={16} className="rp-card-arrow dir-flip" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <RoadmapDisclaimer />
        </FeatureGate>
      ) : (
        <AuthGate message={tr("برای استفاده از این سرویس وارد شوید", "Sign in to use this service")} />
      )}

      {wizard && (
        <RoadmapWizard initialTopic={wizard.topic} onClose={() => setWizard(null)} onCreated={load} />
      )}

      {deleteTarget && (
        <MentorConfirmDialog
          message={tr(`مسیر «${deleteTarget.title}» و همه‌ی پیشرفتش حذف شود؟ این کار برگشت‌پذیر نیست.`, `Delete the path "${deleteTarget.title}" and all its progress? This cannot be undone.`)}
          confirmLabel={tr("حذف مسیر", "Delete path")}
          busy={deleting}
          error={deleteError}
          onConfirm={removeRoadmap}
          onCancel={() => { if (!deleting) setDeleteTarget(null); }}
        />
      )}
    </section>
  );
}
