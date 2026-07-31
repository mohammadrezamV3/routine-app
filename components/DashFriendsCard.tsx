"use client";

import { useEffect, useState } from "react";
import { X, Check, UserPlus } from "lucide-react";
import { DashCard } from "./DashCard";
import { DashProgressCircle } from "./DashProgressCircle";
import { avatarColorFor } from "@/lib/avatarColor";

type Friend = { friendshipId: string; id: string; name: string; username: string | null; completed: number; total: number; pct: number };
type FriendRequest = { friendshipId: string; id: string; name: string; username: string | null };

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ backgroundColor: avatarColorFor(name), width: size, height: size, fontSize: size * 0.34 }}
    >
      {name.trim().charAt(0) || "؟"}
    </span>
  );
}

// کارتِ «دوستان» — واقعاً به /api/friends وصله (مدلِ Friendship جدید توی
// schema.prisma)، از اول خالیه و کاربر با یوزرنیم درخواست دوستی می‌فرسته.
export function DashFriendsCard({ delay }: { delay?: number }) {
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [authRequired, setAuthRequired] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  async function loadFriends() {
    const res = await fetch("/api/friends");
    if (res.status === 401) { setAuthRequired(true); setFriends([]); return; }
    if (res.ok) setFriends((await res.json()).friends);
  }
  async function loadRequests() {
    const res = await fetch("/api/friends/requests");
    if (res.status === 401) return;
    if (res.ok) setRequests((await res.json()).requests);
  }

  useEffect(() => { loadFriends(); loadRequests(); }, []);

  async function sendRequest() {
    const username = usernameInput.trim();
    if (!username) return;
    setSending(true);
    setFormError(null);
    setFormSuccess(null);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) { setFormError(data.error || "خطایی پیش اومد"); return; }
    setFormSuccess("درخواست دوستی فرستاده شد");
    setUsernameInput("");
  }

  async function acceptRequest(friendshipId: string) {
    await fetch(`/api/friends/${friendshipId}`, { method: "PATCH" });
    setRequests((r) => r.filter((x) => x.friendshipId !== friendshipId));
    loadFriends();
  }
  async function rejectRequest(friendshipId: string) {
    await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
    setRequests((r) => r.filter((x) => x.friendshipId !== friendshipId));
  }

  const list = friends ?? [];

  return (
    <DashCard delay={delay}>
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-dash-text sm:text-[15px]">
          دوستان
          {requests.length > 0 && (
            <span className="mr-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-dash-green px-1 text-[10px] font-bold text-dash-bg">
              {requests.length}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="text-[12px] font-semibold text-dash-green hover:underline sm:text-[12.5px]"
        >
          مشاهده همه
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {authRequired ? (
          <div className="text-[12px] text-dash-muted">برای استفاده از بخش دوستان اول وارد حساب بشو.</div>
        ) : friends === null ? (
          <div className="text-[12px] text-dash-muted">در حال بارگذاری…</div>
        ) : list.length === 0 ? (
          <div className="text-[12px] text-dash-muted">
            هنوز دوستی اضافه نکردی — از «مشاهده همه» می‌تونی با یوزرنیم درخواست بفرستی.
          </div>
        ) : (
          list.map((f) => (
            <div key={f.friendshipId} className="flex items-center justify-between gap-3">
              <DashProgressCircle value={f.pct} size={40} strokeWidth={4} />
              <div className="flex flex-1 items-center justify-end gap-2.5">
                <div className="text-right">
                  <div className="text-[12.5px] font-semibold text-dash-text sm:text-[13.5px]">{f.name}</div>
                  <div className="mt-0.5 text-[10.5px] text-dash-muted sm:text-[11.5px]">
                    {f.completed} از {f.total} برنامه
                  </div>
                </div>
                <Avatar name={f.name} size={36} />
              </div>
            </div>
          ))
        )}
      </div>

      {panelOpen && (
        <>
          <div className="modal-overlay open" onClick={() => setPanelOpen(false)} />
          <div className="modal-panel open">
            <div className="modal-head">
              <div className="modal-title">دوستان</div>
              <button className="nav-close" onClick={() => setPanelOpen(false)} aria-label="بستن">×</button>
            </div>
            <div className="modal-body">
              {authRequired && (
                <div className="section-note">برای استفاده از بخش دوستان اول وارد حساب بشو.</div>
              )}

              {!authRequired && requests.length > 0 && (
                <div className="tm-extra" style={{ marginTop: 0 }}>
                  <div className="domain-sub">درخواست‌های دوستی</div>
                  <div className="flex flex-col gap-2">
                    {requests.map((r) => (
                      <div key={r.friendshipId} className="flex items-center justify-between gap-2 rounded-2xl border border-dash-border bg-white/[0.02] px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => rejectRequest(r.friendshipId)} aria-label="رد کردن" className="flex h-7 w-7 items-center justify-center rounded-full text-[#E05252] transition hover:bg-[#E05252]/10">
                            <X size={15} />
                          </button>
                          <button type="button" onClick={() => acceptRequest(r.friendshipId)} aria-label="قبول کردن" className="flex h-7 w-7 items-center justify-center rounded-full text-dash-green transition hover:bg-dash-green/10">
                            <Check size={15} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="text-right text-[13px] font-semibold text-dash-text">{r.name}</div>
                          <Avatar name={r.name} size={32} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!authRequired && (
                <div className="tm-extra">
                  <div className="domain-sub">افزودن دوست</div>
                  <div className="section-note" style={{ marginTop: 0 }}>یوزرنیمِ دوستت رو وارد کن تا درخواست دوستی بفرستی.</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input
                      type="text"
                      dir="ltr"
                      className="wsearch-newform-name"
                      placeholder="username"
                      value={usernameInput}
                      onChange={(e) => { setUsernameInput(e.target.value); setFormError(null); setFormSuccess(null); }}
                    />
                    <button type="button" disabled={sending} onClick={sendRequest} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                      <UserPlus size={15} style={{ display: "inline", verticalAlign: "-2px", marginLeft: 4 }} />
                      ارسال
                    </button>
                  </div>
                  {formError && <div className="field-error-msg" style={{ display: "block", marginTop: 6 }}>{formError}</div>}
                  {formSuccess && <div className="section-note" style={{ marginTop: 6, color: "var(--accent)" }}>{formSuccess}</div>}
                </div>
              )}

              {!authRequired && (
              <div className="tm-extra">
                <div className="domain-sub">لیست دوستان</div>
                {list.length === 0 ? (
                  <div className="item-line empty">هنوز دوستی اضافه نکردی.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {list.map((f) => (
                      <div key={f.friendshipId} className="flex items-center justify-between gap-3 rounded-2xl border border-dash-border bg-white/[0.02] px-3 py-2.5">
                        <span className="mono text-[12px] text-dash-muted">{f.pct}٪</span>
                        <div className="flex items-center gap-2.5">
                          <div className="text-right text-[13px] font-semibold text-dash-text">{f.name}</div>
                          <Avatar name={f.name} size={32} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashCard>
  );
}
