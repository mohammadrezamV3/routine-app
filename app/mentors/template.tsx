import { MentorRouteTransition } from "@/components/MentorMotion";

/** ورودِ نرمِ هر صفحه‌ی منتور (template با هر ناوبری دوباره mount می‌شود) */
export default function Template({ children }: { children: React.ReactNode }) {
  return <MentorRouteTransition>{children}</MentorRouteTransition>;
}
