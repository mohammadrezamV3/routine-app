// نقطه‌ی ورودِ اپ — معادلِ <head>/<body>ِ app/layout.tsx:
//   ۱) اسکریپت‌های init ِ خودِ وب (تم از کوکی، ردهٔ دستگاه، بازخوردِ لمس) —
//      قبل از اولین رندرِ React، دقیقا مثلِ تگ‌های <script> inline ِ layout
//   ۲) فونت‌ها + app/globals.css ِ وب + app-shell.css
//   ۳) BrowserRouter (Capacitor برای مسیرهای بدونِ پسوند index.html رو
//      سرو می‌کنه؛ کدِ وب هم window.location.search رو مستقیم می‌خونه)
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { THEME_INIT_SCRIPT } from "@/lib/themeColor";
import { PERF_INIT_SCRIPT } from "@/lib/perfTier";
import { TAP_FEEDBACK_INIT_SCRIPT } from "@/lib/tapFeedback";
import "@m/shell/fonts.css";
import "@/app/globals.css";
import "@m/shell/app-shell.css";
import { AppRoot } from "@m/shell/AppRoot";

// همون اجرای سینکرونِ <script> inline (نه eval): تگ ساخته و به body
// چسبونده می‌شه، مرورگر همون لحظه اجراش می‌کنه.
function runInlineScript(code: string) {
  const s = document.createElement("script");
  s.textContent = code;
  document.body.appendChild(s);
  s.remove();
}

document.documentElement.setAttribute("data-shell", "app");
runInlineScript(THEME_INIT_SCRIPT);
runInlineScript(PERF_INIT_SCRIPT);
runInlineScript(TAP_FEEDBACK_INIT_SCRIPT);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoot />
    </BrowserRouter>
  </React.StrictMode>
);
