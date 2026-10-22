"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Map as MapIcon, Plus } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { AuthGate } from "@/components/AuthGate";
import { RoadmapWizard } from "@/components/RoadmapWizard";
import { RoadmapDisclaimer } from "@/components/RoadmapDisclaimer";
import { LoadingBlock } from "@/components/Spinner";
import {
  RoadmapComposer, RoadmapContinueCard, RoadmapList, RoadmapStepper, RoadmapSummary, isContinuable, type RoadmapCardData,
} from "@/components/RoadmapCards";
import { MentorConfirmDialog } from "@/components/MentorConfirmDialog";
import { useLiveRefresh } from "@/lib/liveSync";
import { tr, iso } from "@/lib/i18n";

export default function RoadmapsHub() {
  const { status } = useSession();
  const [roadmaps, setRoadmaps] = useState<RoadmapCardData[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [wizard, setWizard] = useState<{ topic: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapCardData | null>(null);
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

  function openDeleteConfirm(r: RoadmapCardData) {
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

  const featured = roadmaps.find(isContinuable);

  const hasData = status === "authenticated" && loaded && roadmaps.length > 0;

  return (
    <section className="roadmaps-desktop rmx-hub">
      <header className="rmx-head">
        <div className="rmx-head-text">
          <span className="rmx-kicker">{tr("مسیر یادگیری", "Learning path")}</span>
          <h1 className="rmx-title">{tr("رودمپ‌ها", "Roadmaps")}</h1>
        </div>
        {hasData && (
          <button type="button" className="btn btn-primary btn-sm rmx-head-btn" onClick={() => setWizard({ topic: "" })}>
            <Plus size={16} /> {tr("مسیر تازه", "New path")}
          </button>
        )}
      </header>

      {status === "authenticated" ? (
        <FeatureGate feature="roadmaps">
          {!loaded ? (
            <LoadingBlock />
          ) : !roadmaps.length ? (
            <>
              <div className="trade-surface rmx-box rmx-empty">
                <div className="rmx-empty-art" aria-hidden="true">
                  <span className="rmx-empty-icon"><MapIcon size={24} strokeWidth={1.7} /></span>
                  <RoadmapStepper total={5} done={1} />
                </div>
                <h2>{tr("اولین مسیرت رو بساز", "Build your first path")}</h2>
                <p>
                  {tr("بگو چی می‌خوای یاد بگیری. یه مسیر مرحله‌به‌مرحله می‌گیری که هر مرحله‌ش سرفصل، کار عملی، پروژه، منبع و معیار تموم‌شدن داره.", "Tell us what you want to learn. You get a step-by-step path where every stage has topics, practical tasks, a project, resources and a finish line.")}
                </p>
                <RoadmapComposer bare onStart={(topic) => setWizard({ topic })} />
              </div>
              <RoadmapDisclaimer />
            </>
          ) : (
            <div className="rmx-cols">
              <div className="rmx-col-main">
                {featured && <RoadmapContinueCard r={featured} />}
                <RoadmapList roadmaps={roadmaps} onDelete={openDeleteConfirm} />
              </div>
              <aside className="rmx-col-side">
                <RoadmapComposer onStart={(topic) => setWizard({ topic })} />
                <RoadmapSummary roadmaps={roadmaps} />
                <RoadmapDisclaimer />
              </aside>
            </div>
          )}
        </FeatureGate>
      ) : (
        <AuthGate message={tr("برای استفاده از این سرویس وارد شوید", "Sign in to use this service")} />
      )}

      {wizard && (
        <RoadmapWizard initialTopic={wizard.topic} onClose={() => setWizard(null)} onCreated={load} />
      )}

      {deleteTarget && (
        <MentorConfirmDialog
          message={tr(`مسیر «${deleteTarget.title}» و همه‌ی پیشرفتش حذف شود؟ این کار برگشت‌پذیر نیست.`, `Delete the path "${iso(deleteTarget.title)}" and all its progress? This cannot be undone.`)}
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
