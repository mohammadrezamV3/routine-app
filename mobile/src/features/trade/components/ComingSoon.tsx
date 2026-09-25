import { WifiOff } from "lucide-react";

interface Props {
  title: string;
  note?: string;
}

// کارت جایگزینِ فیچرهای «فقط آنلاین» (تقویم اقتصادی زنده، اتصال متاتریدر،
// قیمت لحظه‌ای) — طبق تسک این‌ها در اپ موبایلِ آفلاین پیاده نمی‌شوند، فقط
// یک کارت تمیز «نیاز به اینترنت/به‌زودی» نشان داده می‌شود.
export default function ComingSoon({ title, note }: Props) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-card border px-6 py-10 text-center"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: 52, height: 52, background: "var(--surface-2)" }}
      >
        <WifiOff size={24} color="var(--muted)" />
      </div>
      <p className="font-vazir text-[15px] font-semibold" style={{ color: "var(--text)" }}>
        {title}
      </p>
      <p className="font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
        {note || "این بخش نیاز به اینترنت دارد و در اپ آفلاین به‌زودی اضافه می‌شود."}
      </p>
    </div>
  );
}
