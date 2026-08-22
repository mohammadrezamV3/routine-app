import { Inbox } from "lucide-react";

export function EmptyState({ message = "داده‌ای برای نمایش وجود ندارد" }: { message?: string }) {
  return (
    <div className="admin-empty">
      <Inbox size={22} strokeWidth={1.5} />
      <span>{message}</span>
    </div>
  );
}
