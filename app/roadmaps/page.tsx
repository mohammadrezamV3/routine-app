"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Map } from "lucide-react";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { AuthGate } from "@/components/AuthGate";

type CustomRoadmapSummary = { id: string; topic: string; title: string; note: string };

export default function RoadmapsHub() {
  const router = useRouter();
  const { status } = useSession();
  const [customRoadmaps, setCustomRoadmaps] = useState<CustomRoadmapSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") { setLoaded(true); return; }
    fetch("/api/roadmaps")
      .then((r) => r.json())
      .then((res) => setCustomRoadmaps(res.roadmaps || []))
      .finally(() => setLoaded(true));
  }, [status]);

  return (
    <section className="roadmaps-desktop">
      <div className="trade-head-row">
        <h1>رودمپ‌ها</h1>
        <button type="button" className="trade-title-add-btn" onClick={() => router.push("/roadmaps/new")}>
          + افزودن رودمپ
        </button>
      </div>
      <div className="section-note">بگو چی می‌خوای یاد بگیری، یه مسیر کامل باهات می‌سازیم</div>

      {status === "authenticated" ? (
        <SuperAdminGate>
          {loaded && !customRoadmaps.length ? (
            <div className="trade-surface trade-empty-state" style={{ marginTop: 16 }}>
              <Map size={32} />
              <p>هنوز رودمپی نساختی</p>
            </div>
          ) : (
            <div className="rm-grid">
              {customRoadmaps.map((r) => (
                <div key={r.id} className="rm-box" onClick={() => router.push(`/roadmaps/custom/${r.id}`)} style={{ cursor: "pointer" }}>
                  <div>
                    <div className="rm-box-title">{r.title}</div>
                    <div className="rm-box-desc">{r.note}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SuperAdminGate>
      ) : (
        <AuthGate message="برای استفاده از این سرویس وارد شوید" />
      )}
    </section>
  );
}
