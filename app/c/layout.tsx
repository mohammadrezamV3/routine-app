import "@/app/_area/mentors.css";
import { FeaturePageGate } from "@/components/FeaturePageGate";

// لینک کوتاه مربی (/c/[username]): صفحه‌ی عمومی، پشت فلگ «mentors» پنل ادمین
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="mentors">{children}</FeaturePageGate>;
}
