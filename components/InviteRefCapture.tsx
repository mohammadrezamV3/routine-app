"use client";

import { useEffect } from "react";
import { captureInviteRef } from "@/lib/invite";

// لینک دعوت دوست (`?ref=CODE`) روی هر صفحه‌ای که باز بشه نگه داشته می‌شه —
// جزئیات در lib/invite.ts. هیچ رندری نداره.
export function InviteRefCapture() {
  useEffect(() => { captureInviteRef(); }, []);
  return null;
}
