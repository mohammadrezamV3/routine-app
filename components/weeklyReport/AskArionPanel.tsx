"use client";

import { useState } from "react";
import { Bot, Send } from "lucide-react";

type Message = { role: "user" | "arion"; text: string };

const SUGGESTIONS = ["چرا این هفته افت کردم؟", "بیشترین مشکلِ من چی بود؟", "هفته‌ی بعد روی چی تمرکز کنم؟"];

// چتِ ساده و stateless — تاریخچه فقط توی state محلیِ همین صفحه‌ست، بینِ
// رفرش/سشن ذخیره نمی‌شه (تصمیمِ دامنه‌ایِ V2). Context هر سوال از همون
// گزارشِ هفتگیِ فعلی میاد (app/api/reports/weekly/ask)، نه یک چت‌بات عمومی.
export function AskArionPanel({ offset }: { offset: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    if (asking || !q.trim()) return;
    setAsking(true);
    setError(null);
    setMessages((m) => [...m, { role: "user", text: q }]);
    setQuestion("");
    try {
      const res = await fetch("/api/reports/weekly/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, offset }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "خطایی پیش اومد"); return; }
      setMessages((m) => [...m, { role: "arion", text: data.answer }]);
    } catch {
      setError("مشکلی در اتصال به سرور پیش اومد");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="wr-block">
      <div className="wr-block-title"><Bot size={15} /> از Arion بپرس</div>
      <div className="wr-ask-panel">
        {messages.length === 0 ? (
          <div className="wr-ask-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="wr-ask-suggestion-btn" onClick={() => ask(s)} disabled={asking}>{s}</button>
            ))}
          </div>
        ) : (
          <div className="wr-ask-messages">
            {messages.map((m, i) => (
              <div key={i} className={`wr-ask-msg ${m.role}`}>{m.text}</div>
            ))}
            {asking && <div className="wr-ask-msg arion typing">در حال فکرکردن…</div>}
          </div>
        )}

        {error && <div className="field-error-msg" style={{ display: "block", marginTop: 8 }}>{error}</div>}

        <div className="wr-ask-input-row">
          <input
            className="wsearch-newform-name" placeholder="سوالت رو بپرس…"
            value={question} onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ask(question); } }}
          />
          <button type="button" className="wr-ask-send-btn" onClick={() => ask(question)} disabled={asking || !question.trim()} aria-label="ارسال">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
