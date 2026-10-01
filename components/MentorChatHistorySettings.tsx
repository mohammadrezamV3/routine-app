"use client";

import "./mentor.css";
import { useCallback, useEffect, useState } from "react";
import { History, Trash2 } from "lucide-react";
import { AccountBlock } from "./AccountUI";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { MentorList, MentorListItem } from "./MentorMotion";
import { Spinner } from "./Spinner";
import { MentorEmpty } from "./MentorUI";
import { useFeature } from "@/lib/useFeatures";
import type { ChatHistoryResponse } from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { fmtDate, fmtRelative, NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";
import { GoldenName } from "@/components/GoldenName";

type Conv = ChatHistoryResponse["conversations"][number];
type Confirm = { kind: "one"; conv: Conv } | { kind: "all" };

/**
 * «سابقه‌ی گفت‌وگو» در تنظیمات پنل کاربری. پاک کردن فقط برای خود کاربر است:
 * پیام‌ها برای او دیگر نمایش داده نمی‌شوند و نسخه‌ی طرف مقابل دست نمی‌خورد
 * (lib/mentorChatHistory.ts). وقتی بخش منتورها خاموش است یا گفت‌وگویی نیست، نمایش داده نمی‌شود.
 */
export function MentorChatHistorySettings({ index = 0, showEmpty = false }: { index?: number; showEmpty?: boolean }) {
  const on = useFeature("mentors");
  const [list, setList] = useState<Conv[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/mentorships/chat-history", { cache: "no-store" });
      if (res.status === 401 || res.status === 403 || res.status === 404) { setList([]); return; }
      if (!res.ok) { setLoadError(await readApiError(res, "سابقه‌ی گفت‌وگو دریافت نشد؛ دوباره تلاش کن")); return; }
      const d: ChatHistoryResponse = await res.json();
      setList(d.conversations);
    } catch {
      setLoadError(NETWORK_ERROR);
    }
  }, []);

  useEffect(() => { if (on) load(); }, [on, load]);

  async function clear() {
    if (!confirm) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mentorships/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirm.kind === "all" ? { all: true } : { mentorshipId: confirm.conv.id }),
      });
      if (!res.ok) { setError(await readApiError(res, "سابقه پاک نشد؛ دوباره تلاش کن")); return; }
      setConfirm(null);
      await load();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  // در صفحه‌ی خودش (/account/general/chats) به‌جای صفحه‌ی خالی یک پیام کوتاه
  if (!on) return showEmpty ? <MentorEmpty>بخش مربی‌ها فعلا در دسترس نیست</MentorEmpty> : null;
  if (list !== null && list.length === 0 && !loadError) return showEmpty ? <MentorEmpty>هنوز گفت‌وگویی با مربی یا شاگردی نداری</MentorEmpty> : null;

  const withMessages = (list ?? []).filter((c) => c.messageCount > 0);

  return (
    <AccountBlock title="سابقه‌ی گفت‌وگو" icon={<History size={15} />} flush index={index}>
      {loadError ? (
        <div className="mentor-history-empty">
          <span className="form-inline-error" role="alert">{loadError}</span>
          <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={load}>تلاش دوباره</button>
        </div>
      ) : list === null ? (
        <div className="mentor-history-empty"><Spinner size={16} /></div>
      ) : (
        <>
          <MentorList>
            {list.map((c) => {
              const name = publicUserName(c.counterpart);
              return (
                <MentorListItem key={c.id}>
                  <div className="mentor-row mentor-history-row">
                    <span className="mentor-row-lead"><MentorUserAvatar name={name} avatarUrl={c.counterpart.avatarUrl} size={36} /></span>
                    <span className="mentor-row-body">
                      <span className="mentor-row-title"><GoldenName golden={c.counterpart.golden}>{name}</GoldenName></span>
                      <span className="mentor-row-sub">
                        <span>{c.role === "student" ? "مربی" : "شاگرد"}</span>
                        {c.messageCount > 0
                          ? <><span>{faNum(c.messageCount)} پیام</span>{c.lastMessageAt && <span>آخرین پیام {fmtRelative(c.lastMessageAt)}</span>}</>
                          : <span>{c.clearedAt ? `پاک‌شده در ${fmtDate(c.clearedAt)}` : "بدون پیام"}</span>}
                      </span>
                    </span>
                    <span className="mentor-row-end">
                      <button
                        type="button"
                        className="account-outline-btn muted mentor-btn is-sm"
                        onClick={() => { setError(null); setConfirm({ kind: "one", conv: c }); }}
                        disabled={c.messageCount === 0}
                      >
                        پاک کردن سابقه
                      </button>
                    </span>
                  </div>
                </MentorListItem>
              );
            })}
          </MentorList>
          <div className="mentor-history-foot">
            <p className="mentor-field-hint">پیام‌ها فقط برای تو پاک می‌شوند؛ نسخه‌ی طرف مقابل می‌ماند</p>
            <button
              type="button"
              className="trade-danger-btn mentor-btn is-sm"
              onClick={() => { setError(null); setConfirm({ kind: "all" }); }}
              disabled={withMessages.length === 0}
            >
              <Trash2 size={14} strokeWidth={1.75} aria-hidden /> پاک کردن همه
            </button>
          </div>
        </>
      )}

      {confirm && (
        <MentorConfirmDialog
          message={confirm.kind === "all" ? "سابقه‌ی همه‌ی گفت‌وگوها پاک شود؟" : `سابقه‌ی گفت‌وگو با ${publicUserName(confirm.conv.counterpart)} پاک شود؟`}
          hint="پیام‌های تا این لحظه فقط برای تو پاک می‌شوند و برنمی‌گردند؛ طرف مقابل همچنان آن‌ها را می‌بیند."
          confirmLabel={confirm.kind === "all" ? "پاک کردن همه" : "پاک کردن سابقه"}
          busy={busy}
          error={error}
          onConfirm={clear}
          onCancel={() => { setConfirm(null); setError(null); }}
        />
      )}
    </AccountBlock>
  );
}
