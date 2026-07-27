// فراخوانی Claude API برای تولید رودمپ ساختاریافته از روی یک موضوع دلخواه.
// خروجی باید فقط JSON خام باشه (بدون توضیح اضافه)، طبق الگوی مشخص‌شده در
// system prompt، تا مستقیم قابل ذخیره در مدل Roadmap باشه.

const SYSTEM_PROMPT = `تو یک طراح مسیر یادگیری (roadmap) هستی. کاربر یک موضوع می‌ده و تو باید یک
مسیر یادگیری ساختاریافته و واقع‌بینانه براش بسازی، به زبان فارسی.

فقط و فقط یک JSON خام برگردون، بدون هیچ متن اضافه قبل یا بعدش، بدون Markdown fences.
دقیقاً با این شکل:

{
  "title": "عنوان کوتاه مسیر",
  "note": "یک جمله توضیح کلی درباره این مسیر",
  "stations": [
    { "t": "عنوان مرحله", "items": ["نکته ۱", "نکته ۲", "نکته ۳", "نکته ۴"] }
  ],
  "tips": ["نکته کلیدی ۱", "نکته کلیدی ۲", "نکته کلیدی ۳"],
  "pro": ["توصیه برای حرفه‌ای‌شدن ۱", "توصیه برای حرفه‌ای‌شدن ۲"],
  "books": ["نام کتاب یا منبع ۱", "نام کتاب یا منبع ۲"]
}

بین ۴ تا ۶ مرحله (station) بساز، هر کدوم با ۳ تا ۵ آیتم. واقع‌بین باش، نه ژنریک.`;

export type GeneratedRoadmap = {
  title: string;
  note: string;
  stations: { t: string; items: string[] }[];
  tips: string[];
  pro: string[];
  books: string[];
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string" && x.trim().length > 0);
}

/**
 * مدل زبانی گاهی خروجی رو دقیقاً طبق شکل خواسته‌شده برنمی‌گردونه (فیلد
 * جاافتاده، station بدون items، و ...). این تابع خروجی رو اعتبارسنجی و
 * نرمال می‌کنه تا هیچ‌وقت داده ناقص/بدشکل به دیتابیس یا UI نرسه — چون
 * صفحه جزئیات رودمپ مستقیم روی این فیلدها .map می‌زنه و با undefined کرش می‌کنه.
 */
function normalizeRoadmap(raw: any): GeneratedRoadmap {
  if (!raw || typeof raw !== "object") {
    throw new Error("خروجی مدل ساختار معتبری نداشت");
  }

  const stationsRaw = Array.isArray(raw.stations) ? raw.stations : [];
  const stations = stationsRaw
    .map((s: any) => ({
      t: typeof s?.t === "string" && s.t.trim() ? s.t.trim() : "مرحله بدون عنوان",
      items: asStringArray(s?.items),
    }))
    .filter((s: any) => s.items.length > 0);

  if (stations.length === 0) {
    throw new Error("مدل هیچ مرحله‌ی قابل‌استفاده‌ای برنگردوند");
  }

  return {
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "مسیر یادگیری",
    note: typeof raw.note === "string" ? raw.note.trim() : "",
    stations,
    tips: asStringArray(raw.tips),
    pro: asStringArray(raw.pro),
    books: asStringArray(raw.books),
  };
}

async function callClaudeOnce(topic: string): Promise<GeneratedRoadmap> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY تنظیم نشده — این فیچر بدون کلید API کار نمی‌کند");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `موضوع: ${topic}` }],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`خطا در فراخوانی Claude API: ${response.status} ${text}`);
  }

  const data = await response.json();
  const text: string = (data.content || [])
    .map((block: any) => (block.type === "text" ? block.text : ""))
    .join("");

  const cleaned = text.replace(/```json|```/g, "").trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("پاسخ مدل قابل تبدیل به JSON نبود");
  }

  return normalizeRoadmap(parsed);
}

/**
 * تا ۲ بار امتحان می‌کنه — چون خطای parse/شکل گاهی گذراست (یک تولید بد
 * تصادفی)، نه یک خطای ساختاری همیشگی. اگه هر دو بار شکست خورد، همون خطای
 * تلاش آخر رو برمی‌گردونه.
 */
export async function generateRoadmap(topic: string): Promise<GeneratedRoadmap> {
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callClaudeOnce(topic);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
