"use client";

import "./coach.css";
import type { ReactNode } from "react";

/** حالت خالی دلگرم‌کننده: آیکون، یک جمله، حداکثر یک دکمه */
export function CoachEmpty({ icon, text, action }: { icon?: ReactNode; text: string; action?: ReactNode }) {
  return (
    <div className="ch-empty">
      {icon && <span className="ch-empty-ico" aria-hidden="true">{icon}</span>}
      <p className="ch-empty-text">{text}</p>
      {action}
    </div>
  );
}
