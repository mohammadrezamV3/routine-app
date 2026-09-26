import { Lock } from "lucide-react";
import { MODULE_LOCKED_MESSAGE } from "../errors";

/** حالتِ «این ماژول در پلن شما فعال نیست» — وقتی سرور 403 module_locked
 *  می‌دهد. طرحِ AI/کالری/ورزش هم قراره از همین الگو استفاده کنند. */
export default function LockedModuleState() {
  return (
    <main className="flex flex-col items-center justify-center gap-4" style={{ minHeight: "60vh", padding: 20 }}>
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: 64, height: 64, background: "var(--surface-2)" }}
      >
        <Lock size={28} color="var(--muted)" />
      </div>
      <p className="font-vazir text-[14.5px] text-center" style={{ color: "var(--text)" }}>
        {MODULE_LOCKED_MESSAGE}
      </p>
      <p className="font-vazir text-[12.5px] text-center" style={{ color: "var(--muted)" }}>
        برای فعال‌سازی، اشتراکِ خودت را از حساب کاربری بررسی کن.
      </p>
    </main>
  );
}
