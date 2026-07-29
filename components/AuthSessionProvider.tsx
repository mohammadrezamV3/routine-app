"use client";

import { SessionProvider } from "next-auth/react";

// refetchOnWindowFocus خاموشه — این اپ نیازی به رفرشِ سشن با هر بار برگشتن
// به تب نداره، و این رفتار فقط یه فچِ اضافه‌ی بی‌فایده به /api/auth/session
// روی هر فوکوس اضافه می‌کرد.
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}
