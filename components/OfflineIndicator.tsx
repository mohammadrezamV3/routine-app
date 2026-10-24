"use client";

// نشانگر آفلاین هدر: فقط وقتی آفلاینیم یا نوشتنی منتظر ارسال داریم دیده می‌شه.
// زیر هدر شناوره (position:fixed، هیچ جایی از چیدمان رو نمی‌گیره) و از همون
// شیشه‌ی هدر استفاده می‌کنه. باید بیرون از <header> رندر بشه چون backdrop-filter
// هدر برای فرزندهای fixed قاب جدید می‌سازه. نتیجه‌ی همگام‌سازی (خطا/موفقیت) در
// OfflineToasts میاد، نه این‌جا.
import { Spinner } from "@/components/Spinner";
import { tr } from "@/lib/i18n";
import { syncNow, useOfflineStatus } from "@/lib/offline/status";

function queuedText(n: number): string {
  return n === 1 ? tr("1 تغییر در صف", "1 change queued") : tr(`${n} تغییر در صف`, `${n} changes queued`);
}
function waitingText(n: number): string {
  return n === 1 ? tr("1 تغییر منتظر ارسال", "1 change waiting to send") : tr(`${n} تغییر منتظر ارسال`, `${n} changes waiting to send`);
}

export default function OfflineIndicator() {
  const { online, pending, syncing } = useOfflineStatus();
  const show = !online || pending > 0;

  let body: React.ReactNode = null;
  if (show) {
    if (!online) {
      body = (
        <span className="offline-pill" data-state="offline">
          <span className="offline-pill-dot" aria-hidden="true" />
          <span>{tr("آفلاین", "Offline")}</span>
          {pending > 0 && <span className="offline-pill-sub">{queuedText(pending)}</span>}
        </span>
      );
    } else if (syncing) {
      body = (
        <span className="offline-pill" data-state="syncing">
          <Spinner size={13} label={null} />
          <span>{tr("در حال همگام‌سازی", "Syncing")}</span>
        </span>
      );
    } else {
      body = (
        <button type="button" className="offline-pill offline-pill-btn" data-state="pending" onClick={() => { void syncNow(); }}>
          <span className="offline-pill-dot" aria-hidden="true" />
          <span>{waitingText(pending)}</span>
        </button>
      );
    }
  }

  return (
    <div className="offline-pill-wrap" role="status" aria-live="polite">
      {body}
    </div>
  );
}
