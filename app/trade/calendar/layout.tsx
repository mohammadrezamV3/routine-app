import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «economicCalendar»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="economicCalendar">{children}</FeaturePageGate>;
}
