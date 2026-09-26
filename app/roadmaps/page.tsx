"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronLeft, Clock, Layers, Map, Plus } from "lucide-react";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { AuthGate } from "@/components/AuthGate";
import { RoadmapWizard } from "@/components/RoadmapWizard";
import { RoadmapDisclaimer } from "@/components/RoadmapDisclaimer";
import { LoadingBlock } from "@/components/Spinner";
import { faNum } from "@/lib/jalali";
import { levelLabel } from "@/lib/roadmapPlan";

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
};

// چند موضوعِ نمونه برای حالتِ خالی — یک کلیک ویزارد را با همان موضوع باز
// می‌کند، تا کاربری که نمی‌داند چه بنویسد جلوی یک فیلدِ خالی نماند.
const SUGGESTIONS = ["برنامه‌نویسی وب", "امنیت شبکه", "تحلیل داده با پایتون", "طراحی UI/UX", "زبان انگلیسی", "ادیت ویدیو"];

export default function RoadmapsHub() {
  const { status } = useSession();
  const [roadmaps, setRoadmaps] = useState<RoadmapCard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [wizard, setWizard] = useState<{ topic: string } | null>(null);

  const load = useCallback(() => {
    if (status !== "authenticated") { setLoaded(true); return; }
    fetch("/api/roadmaps")
      .then((r) => r.json())
      .then((res) => setRoadmaps(res.roadmaps || []))
      .catch(() => setRoadmaps([]))
      .finally(() => setLoaded(true));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="roadmaps-desktop rp-hub">
      <div className="trade-head-row">
        <h1>رودمپ‌ها</h1>
        {status === "authenticated" && (
          <button type="button" className="trade-title-add-btn" onClick={() => setWizard({ topic: "" })}>
            + مسیرِ جدید
          </button>
        )}
      </div>

      {status === "authenticated" ? (
        <SuperAdminGate>
          {!loaded ? (
            <LoadingBlock />
          ) : !roadmaps.length ? (
            <div className="trade-surface rp-empty">
              <span className="rp-empty-icon"><Map size={26} /></span>
              <h2>اولین مسیرت رو بساز</h2>
              <p>
                بگو چی می‌خوای یاد بگیری و برای چی. یه مسیرِ مرحله‌به‌مرحله می‌گیری که هر مرحله‌ش سرفصل‌های ریز،
                کارهای عملی، پروژه، ابزار، منبع و معیارِ تموم‌شدن داره.
              </p>
              <div className="rp-empty-chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="rp-chip-btn" onClick={() => setWizard({ topic: s })}>
                    {s}
                  </button>
                ))}
              </div>
              <button type="button" className="trade-primary-btn rp-empty-cta" onClick={() => setWizard({ topic: "" })}>
                <Plus size={15} /> ساختِ مسیر
              </button>
            </div>
          ) : (
            <div className="rp-grid">
              {roadmaps.map((r) => (
                <Link key={r.id} href={`/roadmaps/custom/${r.id}`} className="trade-surface rp-card">
                  <div className="rp-card-eyebrow">{r.topic}</div>
                  <div className="rp-card-title">{r.title}</div>
                  {r.summary && <p className="rp-card-desc">{r.summary}</p>}

                  <div className="rp-card-meta">
                    {r.totalDuration && <span><Clock size={12} /> {r.totalDuration}</span>}
                    {r.stageCount > 0 && <span><Layers size={12} /> {faNum(r.stageCount)} مرحله</span>}
                    {levelLabel(r.level) && <span>{levelLabel(r.level)}</span>}
                  </div>

                  <div className="rp-card-foot">
                    <div className="rp-bar"><span style={{ width: `${r.pct}%` }} /></div>
                    <span className="rp-card-pct">{faNum(r.pct)}٪</span>
                    <ChevronLeft size={16} className="rp-card-arrow" />
                  </div>
                </Link>
              ))}
            </div>
          )}
          <RoadmapDisclaimer />
        </SuperAdminGate>
      ) : (
        <AuthGate message="برای استفاده از این سرویس وارد شوید" />
      )}

      {wizard && (
        <RoadmapWizard initialTopic={wizard.topic} onClose={() => setWizard(null)} onCreated={load} />
      )}
    </section>
  );
}
