"use client";

import { useState } from "react";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";
import {
  BROADCAST_MODULE_LABEL, BROADCAST_SEGMENT_LABEL, BROADCAST_STATUS_LABEL, canCancelBroadcast,
  type BroadcastRecord, type BroadcastStatus,
} from "@/lib/broadcast";
import { tr } from "@/lib/i18n";

export type PublicBroadcast = Omit<BroadcastRecord, "cursor" | "leaseUntil" | "runs">;

const TONE: Record<BroadcastStatus, string> = { scheduled: "amber", sending: "amber", sent: "green", failed: "red", canceled: "gray" };

export function AdminBroadcastHistory({ items, onChanged }: { items: PublicBroadcast[] | null; onChanged: () => void }) {
  const toast = useAdminToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function cancel(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      await adminFetch(`/api/admin/broadcast?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      toast(tr("پیام لغو شد", "Message canceled"));
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusyId(null);
      onChanged();
    }
  }

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head">
        <span className="admin-chart-title">{tr("تاریخچه", "History")}</span>
        <button type="button" className="admin-btn sm" onClick={onChanged}>{tr("تازه‌سازی", "Refresh")}</button>
      </div>
      {!items ? (
        <div className="admin-empty is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>
      ) : items.length === 0 ? (
        <EmptyState message={tr(tr("هنوز پیامی ارسال نشده", "No messages sent yet"), "No messages sent yet")} />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>{tr("پیام", "Message")}</th><th>{tr("مخاطب", "Audience")}</th><th>{tr("وضعیت", "Status")}</th><th>{tr("گیرنده", "Recipients")}</th><th>{tr("زمان", "Time")}</th><th>{tr("ارسال‌کننده", "Sent by")}</th><th /></tr></thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div>{b.title}</div>
                    <div className="admin-muted">{b.channels.map((c) => (c === "push" ? tr("پوش", "Push") : tr("درون‌برنامه", "In-app"))).join(" + ")}</div>
                  </td>
                  <td>
                    {BROADCAST_SEGMENT_LABEL[b.segment.kind]}
                    {b.segment.module ? ` · ${BROADCAST_MODULE_LABEL[b.segment.module]}` : ""}
                  </td>
                  <td>
                    <span className={`admin-badge ${TONE[b.status]}`}>{BROADCAST_STATUS_LABEL[b.status]}</span>
                    {b.error && <div className="admin-muted">{b.error}</div>}
                  </td>
                  <td className="admin-ltr">{b.status === "scheduled" || b.status === "canceled" ? "—" : formatNumber(b.recipients)}</td>
                  <td className="admin-ltr">{formatDateTime(b.sentAt || b.sendAt)}</td>
                  <td>{b.createdByName || "—"}</td>
                  <td>
                    {canCancelBroadcast(b) && (
                      <button type="button" className="admin-btn sm danger" disabled={busyId === b.id} onClick={() => cancel(b.id)}>{tr("لغو", "Cancel")}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
