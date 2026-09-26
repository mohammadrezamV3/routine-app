import { BookOpen } from "lucide-react";
import AppHeader from "@/components/AppHeader";

export default function MoreRoadmaps() {
  return (
    <div>
      <AppHeader title="رودمپ‌ها" showBack />
      <main className="flex flex-col items-center justify-center gap-4" style={{ minHeight: "70vh", padding: 20 }}>
        <BookOpen size={48} color="var(--muted)" />
        <p className="font-vazir text-[14.5px] text-center" style={{ color: "var(--text)" }}>
          رودمپ‌های یادگیری به‌زودی به این‌جا اضافه خواهند شد.
        </p>
        <p className="font-vazir text-[12.5px] text-center" style={{ color: "var(--muted)" }}>
          در وب‌سایت آریون رودمپ‌های خود را بسازید و مدیریت کنید.
        </p>
      </main>
    </div>
  );
}
