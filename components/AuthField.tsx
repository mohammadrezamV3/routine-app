"use client";

import { forwardRef } from "react";

export const AuthField = forwardRef<
  HTMLDivElement,
  { id: string; label: string; error?: string; icon?: React.ReactNode; endAction?: React.ReactNode; children: React.ReactNode }
>(function AuthField({ id, label, error, icon, endAction, children }, ref) {
  return (
    <div ref={ref} className={`name-field-wrap${error ? " field-error" : ""}`} data-anim-field>
      <label htmlFor={id}>{label}</label>
      <div className={`field-error-wrap${icon ? " has-icon" : ""}${endAction ? " has-end-action" : ""}`}>
        {children}
        {icon && <span className="field-icon" aria-hidden="true">{icon}</span>}
        {endAction}
        <span className="field-error-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#E05252" strokeWidth="1.6" />
            <path d="M12 7.2v6.2M12 16.4v.1" stroke="#E05252" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </span>
      </div>
      {error && <div className="field-error-msg">{error}</div>}
    </div>
  );
});
