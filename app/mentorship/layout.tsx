import "@/app/_area/mentorship.css";
import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «mentors»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="mentors">{children}</FeaturePageGate>;
}
