import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — بدنسازی دو بخش داره؛ تا وقتی
// یکیش روشنه صفحه باز می‌مونه و تب خاموش داخل خود صفحه پنهان می‌شه
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature={["exercise", "calorie"]}>{children}</FeaturePageGate>;
}
