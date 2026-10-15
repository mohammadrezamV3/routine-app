"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { hasPermission } from "@/lib/adminPermissions";
import { navGroups, type NavAccess } from "@/components/adminNavConfig";
import { tr } from "@/lib/i18n";
import { useIsEn } from "@/components/I18nProvider";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { Spinner } from "@/components/Spinner";

type Row = { key: string; group: string; title: string; sub?: string; href: string };
type Remote = Record<"users" | "transactions" | "codes" | "tickets", { id: string; title: string; sub: string; href: string }[]>;

function remoteLabels(): [keyof Remote, string][] {
  return [
    ["users", tr("کاربران", "Users")], ["transactions", tr("تراکنش‌ها", "Transactions")], ["codes", tr("کدهای تخفیف", "Discount codes")], ["tickets", tr("تیکت‌ها", "Tickets")],
  ];
}

export function AdminCommandPalette({ open, onClose, access }: { open: boolean; onClose: () => void; access: NavAccess }) {
  const router = useRouter();
  const en = useIsEn();
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<Remote | null>(null);
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(open);

  // همه‌ی صفحه‌های مجاز برای این ادمین
  const pages = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const pageGroup = tr("صفحه‌ها", "Pages");
    for (const g of navGroups()) {
      for (const it of g.items) {
        if (!hasPermission(access, it.perm) || (it.ownerOnly && !access.isSuperAdmin)) continue;
        out.push({ key: it.href, group: pageGroup, title: it.label, sub: g.title, href: it.href });
        for (const c of it.children ?? []) {
          if (c.href === it.href || !hasPermission(access, c.perm)) continue;
          out.push({ key: c.href, group: pageGroup, title: c.label, sub: it.label, href: c.href });
        }
      }
    }
    return out;
  }, [access]);

  useEffect(() => {
    if (open) { setQ(""); setRemote(null); setCursor(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const term = q.trim();
  useEffect(() => {
    if (!open) return;
    if (term.length < 2) { setRemote(null); setBusy(false); return; }
    setBusy(true);
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`, { signal: ac.signal, cache: "no-store" });
        if (res.ok) setRemote(await res.json());
        else setRemote(null);
      } catch { /* abort یا قطع شبکه */ }
      if (!ac.signal.aborted) setBusy(false);
    }, 250);
    return () => { clearTimeout(t); ac.abort(); };
  }, [term, open]);

  const rows = useMemo<Row[]>(() => {
    const low = term.toLowerCase();
    const matched = (low ? pages.filter((p) => `${p.title} ${p.sub ?? ""}`.toLowerCase().includes(low)) : pages).slice(0, low ? 8 : 10);
    const out = [...matched];
    if (remote) {
      for (const [k, label] of remoteLabels()) {
        for (const r of remote[k] ?? []) out.push({ key: `${k}:${r.id}`, group: label, title: r.title, sub: r.sub, href: r.href });
      }
    }
    return out;
  }, [pages, remote, term]);

  useEffect(() => { setCursor(0); }, [term, remote]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const go = (r: Row) => { onClose(); router.push(r.href); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(rows.length - 1, c + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (rows[cursor]) go(rows[cursor]); }
  };

  if (!open || typeof document === "undefined") return null;

  let lastGroup = "";
  return createPortal(
    <div className="ads-pal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ads-pal" role="dialog" aria-modal="true" aria-label={tr("جست‌وجوی سراسری", "Global search")} dir={en ? "ltr" : "rtl"} onKeyDown={onKeyDown}>
        <div className="ads-pal-field">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} className="ads-pal-input"
            placeholder={tr("جست‌وجوی کاربر، تراکنش، کد تخفیف، تیکت یا صفحه", "Search users, transactions, discount codes, tickets or pages")} aria-label={tr("جست‌وجو", "Search")} autoComplete="off"
            role="combobox" aria-expanded="true" aria-controls="ads-pal-list"
          />
          {busy && <Spinner size={14} />}
          <kbd className="ads-kbd">Esc</kbd>
        </div>
        <div className="ads-pal-list" id="ads-pal-list" role="listbox" ref={listRef}>
          {rows.length === 0 && <div className="ads-pal-empty">{busy ? tr("در حال جست‌وجو", "Searching…") : tr("نتیجه‌ای پیدا نشد", "No results found")}</div>}
          {rows.map((r, i) => {
            const head = r.group !== lastGroup ? (lastGroup = r.group) : null;
            return (
              <div key={r.key}>
                {head && <div className="ads-pal-group">{head}</div>}
                <button
                  type="button" role="option" aria-selected={i === cursor} data-i={i}
                  className={`ads-pal-row${i === cursor ? " on" : ""}`} onMouseMove={() => setCursor(i)} onClick={() => go(r)}
                >
                  <span className="ads-pal-title">{r.title}</span>
                  {r.sub && <span className="ads-pal-sub">{r.sub}</span>}
                  {i === cursor && <CornerDownLeft size={13} aria-hidden="true" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="ads-pal-foot"><span><kbd className="ads-kbd">↑↓</kbd> {tr("حرکت", "Move")}</span><span><kbd className="ads-kbd">Enter</kbd> {tr("باز کردن", "Open")}</span></div>
      </div>
    </div>,
    document.body,
  );
}
