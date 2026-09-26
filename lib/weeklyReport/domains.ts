// دیتای خالصِ دامنه‌های گزارش هفتگی — بدون prisma/سرور، تا کامپوننت‌های
// کلاینتی بتونن مستقیم ایمپورتش کنن (metrics.ts همینا رو re-export می‌کنه).
export type Domain = "routine" | "fitness" | "trading" | "learning" | "nutrition";
export const DOMAINS: Domain[] = ["routine", "fitness", "trading", "learning", "nutrition"];
export const DOMAIN_LABELS_FA: Record<Domain, string> = {
  routine: "روتین",
  fitness: "بدنسازی",
  trading: "ترید",
  learning: "یادگیری",
  nutrition: "تغذیه",
};
