import "@/app/_area/exercise.css";
import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «exercise»؛ کالری‌شمار صفحه‌ی جدا (/calorie) و فلگ خودش رو داره
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="exercise">{children}</FeaturePageGate>;
}
