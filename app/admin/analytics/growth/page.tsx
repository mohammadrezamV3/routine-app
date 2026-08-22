"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RangePicker } from "@/components/admin/RangePicker";
import { MultiLineChart } from "@/components/admin/MultiLineChart";

type Resp = { growthSeries: { bucket: string; newUsers: number; activeUsers: number; paidUsers: number }[] };

function GrowthInner() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    fetch(`/api/admin/overview?${sp.toString()}`).then((r) => r.json()).then(setData);
  }, [searchParams]);

  return (
    <section>
      <div className="admin-chart-head" style={{ marginBottom: 18 }}>
        <div />
        <RangePicker />
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">رشد کاربران</span></div>
        {!data ? (
          <div className="admin-empty">در حال بارگذاری…</div>
        ) : (
          <MultiLineChart
            data={data.growthSeries.map((p) => ({ bucket: p.bucket, values: { newUsers: p.newUsers, activeUsers: p.activeUsers, paidUsers: p.paidUsers } }))}
            series={[
              { key: "newUsers", label: "کاربران جدید", color: "#00A86B" },
              { key: "activeUsers", label: "کاربران فعال", color: "#5b9cf6" },
              { key: "paidUsers", label: "کاربران پولی", color: "#e0a636" },
            ]}
          />
        )}
      </div>
    </section>
  );
}

export default function AdminGrowthPage() {
  return (
    <Suspense fallback={<div className="admin-empty">در حال بارگذاری…</div>}>
      <GrowthInner />
    </Suspense>
  );
}
