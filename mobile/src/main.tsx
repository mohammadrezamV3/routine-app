import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./styles/index.css";

// HashRouter عمدا: توی WebView کپاسیتور فایل‌های استاتیک از file://‌مانند
// سرو می‌شن (androidScheme: https ولی بدون سرور واقعی)، مسیرهای history
// معمولی روی رفرش/دیپ‌لینک 404 می‌شن؛ hash-based کاملا آفلاین کار می‌کنه.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
