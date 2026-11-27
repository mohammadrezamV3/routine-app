import "@/app/_area/exercise.css";
import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «calorie». CSS مسیر بدنسازی
// (exercise.css) رو هم میاره چون کارت‌ها و حلقه‌ی بالای صفحه ازش استایل می‌گیرن.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="calorie">{children}</FeaturePageGate>;
}
