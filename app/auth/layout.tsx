import { AuthFrame } from "@/components/AuthFrame";

// قاب مشترک (شل + تب‌های ورود/ثبت‌نام) بین صفحه‌های auth پایدار می‌مونه و با
// ناوبری از نو mount نمی‌شه — توضیح کامل در components/AuthFrame.tsx.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>;
}
