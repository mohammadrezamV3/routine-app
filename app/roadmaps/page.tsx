"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Map } from "lucide-react";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { AuthGate } from "@/components/AuthGate";
import { RoadmapWizard } from "@/components/RoadmapWizard";
import { RoadmapDisclaimer } from "@/components/RoadmapDisclaimer";
import { LoadingBlock } from "@/components/Spinner";
import { faNum } from "@/lib/jalali";

type RoadmapCard = {
  id: string;
  topic: string;
  title: string;
  summary: string | null;
  goal: string | null;
  totalDuration: string | null;
  stageCount: number;
  doneCount: number;
  pct: number;
};

export default function RoadmapsHub() {
  const router = useRouter();
  const { status } = useSession();
  const [roadmaps, setRoadmaps] = useState<RoadmapCard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const load = useCallback(() => {
    if (status !== "authenticated") { setLoaded(true); return; }
    fetch("/api/roadmaps")
      .then((r) => r.json())
      .then((res) => setRoadmaps(res.roadmaps || []))
      .finally(() => setLoaded(true));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="roadmaps-desktop">
      <div className="trade-head-row">
        <h1>رودمپ‌ها</h1>
        <button type="button" className="trade-title-add-btn" onClick={() => setWizardOpen(true)}>
          + افزودن رودمپ
        </button>
      </div>
      {status === "authenticated" ? (
        <SuperAdminGate>
          {!loaded ? (
            <LoadingBlock />
          ) : !roadmaps.length ? (
            <div className="trade-surface trade-page-box rm-page-box rm-empty-box">
              <div className="trade-empty-state">
                <Map size={32} />
                <p>هنوز مسیری نساختی</p>
              </div>
            </div>
          ) : (
            <div className="trade-surface trade-page-box rm-page-box">
              <div className="rm-grid">
                {roadmaps.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="rm-card"
                    onClick={() => router.push(`/roadmaps/custom/${r.id}`)}
                  >
                    <div className="rm-card-title">{r.title}</div>
                    {r.summary && <div className="rm-card-desc">{r.summary}</div>}

                    <div className="rm-card-meta">
                      {r.totalDuration && <span className="rm-chip">{r.totalDuration}</span>}
                      {r.stageCount > 0 && <span className="rm-chip">{faNum(r.stageCount)} مرحله</span>}
                    </div>

                    {r.stageCount > 0 && (
                      <div className="rm-card-progress">
                        <div className="rm-progress-bar"><span style={{ width: `${r.pct}%` }} /></div>
                        <span className="rm-card-pct">{faNum(r.pct)}٪</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          <RoadmapDisclaimer />
        </SuperAdminGate>
      ) : (
        <AuthGate message="برای استفاده از این سرویس وارد شوید" />
      )}

      {wizardOpen && (
        <RoadmapWizard onClose={() => setWizardOpen(false)} onCreated={load} />
      )}
    </section>
  );
}
