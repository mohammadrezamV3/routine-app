"use client";

import { useEffect, useRef, useState } from "react";
import { CONFLICT_ALERT_EVENT } from "@/lib/conflictAlertBus";

export function ConflictAlert() {
  const [message, setMessage] = useState("");
  const [show, setShow] = useState(false);
  const [barKey, setBarKey] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onEvent(e: Event) {
      const detail = (e as CustomEvent).detail as string;
      setMessage(detail);
      setShow(true);
      setBarKey((k) => k + 1);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShow(false), 5000);
    }
    window.addEventListener(CONFLICT_ALERT_EVENT, onEvent);
    return () => window.removeEventListener(CONFLICT_ALERT_EVENT, onEvent);
  }, []);

  return (
    <div className={`conflict-alert${show ? " show" : ""}`}>
      <div className="conflict-alert-text">{message}</div>
      <div className="conflict-alert-bar">
        <div
          key={barKey}
          className="conflict-alert-bar-fill"
          style={{
            transform: show ? "scaleX(0)" : "scaleX(1)",
            transition: show ? "transform 5s linear" : "none",
          }}
        />
      </div>
    </div>
  );
}
