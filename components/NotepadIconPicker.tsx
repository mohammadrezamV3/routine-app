"use client";

// انتخابگرِ آیکونِ صفحه — یه ست کوچیکِ کیوریت‌شده از ایموجی‌های پرکاربرد +
// امکانِ چسبوندنِ هر ایموجیِ دلخواهِ دیگه (بدونِ کتابخانه‌ی emoji-picker جدید)
const CURATED_EMOJIS = [
  "📄", "📝", "📚", "📌", "💡", "🎯", "✅", "📅", "🏋️", "🍎",
  "📈", "💰", "🎓", "🧠", "🚀", "⭐", "🔥", "❤️", "🗂️", "📁",
  "🧩", "🛠️", "🎨", "🎵", "🌱", "☕", "🧘", "💻", "📖", "🔖",
];

export function NotepadIconPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-[19]" onClick={onClose} />
      <div className="notepad-icon-picker">
        <div className="notepad-icon-picker-grid">
          {CURATED_EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => onPick(e)}>{e}</button>
          ))}
        </div>
        <input
          type="text"
          maxLength={8}
          placeholder="یا هر ایموجیِ دیگه رو اینجا بچسبون…"
          className="notepad-icon-picker-input"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
              onPick((e.target as HTMLInputElement).value.trim());
            }
          }}
        />
      </div>
    </>
  );
}
