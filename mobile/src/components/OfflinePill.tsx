import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/lib/useNetworkStatus";

export default function OfflinePill() {
  const online = useNetworkStatus();
  if (online) return null;

  return (
    <div
      className="no-select flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-vazir"
      style={{ background: "var(--accent-dim)", color: "var(--accent-soft)" }}
    >
      <WifiOff size={12} />
      آفلاین
    </div>
  );
}
