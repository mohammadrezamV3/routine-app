"use client";

import { useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { animate } from "animejs";

export function AuthTabs({ active }: { active: "login" | "signup" }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLButtonElement>(null);
  const signupRef = useRef<HTMLButtonElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const target = active === "login" ? loginRef.current : signupRef.current;
    const indicator = indicatorRef.current;
    if (!container || !target || !indicator) return;
    const cRect = container.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    const left = tRect.left - cRect.left;

    if (!mounted.current) {
      indicator.style.left = `${left}px`;
      indicator.style.width = `${tRect.width}px`;
      mounted.current = true;
      return;
    }
    animate(indicator, { left, width: tRect.width, duration: 380, ease: "inOutQuad" });
  }, [active]);

  return (
    <div className="auth-tabs" ref={containerRef}>
      <span className="auth-tab-indicator" ref={indicatorRef} />
      <button
        ref={loginRef}
        type="button"
        className={`auth-tab${active === "login" ? " active" : ""}`}
        onClick={() => active !== "login" && router.push("/auth/login")}
      >
        ورود
      </button>
      <button
        ref={signupRef}
        type="button"
        className={`auth-tab${active === "signup" ? " active" : ""}`}
        onClick={() => active !== "signup" && router.push("/auth/signup")}
      >
        ثبت‌نام
      </button>
    </div>
  );
}
