"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/components/admin/useAdminToast";
import { AdminBroadcastComposer } from "@/components/AdminBroadcastComposer";
import { AdminBroadcastHistory, type PublicBroadcast } from "@/components/AdminBroadcastHistory";

// پیام همگانی: ارسال اعلان درون‌برنامه‌ای و/یا پوش به بخشی از کاربران (دسترسی «content»)
export default function AdminBroadcastPage() {
  const [items, setItems] = useState<PublicBroadcast[] | null>(null);

  const load = useCallback(() => {
    adminFetch<{ broadcasts: PublicBroadcast[] }>("/api/admin/broadcast")
      .then((d) => setItems(d.broadcasts))
      .catch(() => setItems((cur) => cur ?? []));
  }, []);

  useEffect(() => { load(); }, [load]);

  // تا وقتی پیامی در حال ارسال یا زمان‌بندی‌شده است، فهرست هر 15 ثانیه تازه می‌شود
  const live = !!items?.some((b) => b.status === "sending" || b.status === "scheduled");
  useEffect(() => {
    if (!live) return;
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [live, load]);

  return (
    <section>
      <div className="admin-page-head">
        <div className="admin-page-kicker">پیام همگانی</div>
      </div>
      <AdminBroadcastComposer onSent={(b) => { setItems((cur) => [b, ...(cur ?? [])]); load(); }} />
      <AdminBroadcastHistory items={items} onChanged={load} />
    </section>
  );
}
