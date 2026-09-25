import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Map, Plus } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { useRoadmapApi } from "../api";
import { listRoadmaps, refreshRoadmapsFromServer } from "../repo";
import { describeRoadmapError, isModuleLocked } from "../errors";
import LockedModuleState from "../components/LockedModuleState";
import RoadmapCard from "../components/RoadmapCard";
import { roadmapRoutePaths } from "../routes";

export default function RoadmapsList() {
  const navigate = useNavigate();
  const api = useRoadmapApi();
  const online = useNetworkStatus();
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const items = useLiveQuery(() => listRoadmaps(), [], []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!online) {
        setLoading(false);
        return;
      }
      try {
        await refreshRoadmapsFromServer(api);
        if (!cancelled) {
          setLocked(false);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        if (isModuleLocked(err)) setLocked(true);
        else setError(describeRoadmapError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  if (locked) {
    return (
      <div>
        <AppHeader title="رودمپ‌ها" showBack />
        <LockedModuleState />
      </div>
    );
  }

  return (
    <div>
      <AppHeader
        title="رودمپ‌ها"
        showBack
        right={
          <button
            onClick={() => navigate(roadmapRoutePaths.new)}
            aria-label="رودمپ جدید"
            className="flex items-center justify-center"
            style={{ width: 40, height: 40 }}
          >
            <Plus size={20} color="var(--accent)" />
          </button>
        }
      />

      <main className="px-4 pt-4">
        {error && (
          <div
            className="mb-3 rounded-card border px-3 py-2 font-vazir text-[12.5px]"
            style={{ borderColor: "var(--surface-line)", color: "var(--pnl-loss)" }}
          >
            {error}
          </div>
        )}

        {loading && !items?.length ? (
          <div className="flex justify-center py-10">
            <span className="font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
              در حال بارگذاری…
            </span>
          </div>
        ) : !items?.length ? (
          <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: "50vh" }}>
            <Map size={40} color="var(--muted)" />
            <p className="font-vazir text-[13.5px] text-center" style={{ color: "var(--muted)" }}>
              هنوز مسیری نساختی
            </p>
            <button
              onClick={() => navigate(roadmapRoutePaths.new)}
              className="mt-2 rounded-full px-5 py-2.5 font-vazir text-[13.5px] font-semibold"
              style={{ background: "var(--accent)", color: "white" }}
            >
              + افزودن رودمپ
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 pb-4">
            {items.map((item) => (
              <RoadmapCard key={item.id} item={item} onClick={() => navigate(roadmapRoutePaths.detail(item.id))} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
