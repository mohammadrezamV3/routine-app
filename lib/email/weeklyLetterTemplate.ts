// هفته‌نامه — قالب ایمیل. جدول‌محور، inline استایل، بدون وابستگی.
// بازش: renderWeeklyLetterEmail(data, opts) → { subject, html, text }

import { BRAND_FA } from "@/lib/brand";
import type { WeeklyLetterData } from "@/lib/weeklyLetter/types";

// تمام رشته‌های پویا را escape کن تا هیچ HTML injection نباشه.
function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (c) => map[c] || c);
}

// هنجار رشته URL (باید با http:// یا https:// شروع شو)
function sanitizeUrl(url: string): string {
  if (typeof url === "string" && /^https?:\/\//.test(url)) {
    return url;
  }
  return "#";
}

// نقشه‌ی وضعیت تمرین به فارسی
const fitnessStatusMap: Record<string, string> = {
  done: "تمرین انجام شد",
  extra: "تمرین اضافه",
  rest: "استراحت",
  missed: "تمرین جا موند",
  partial: "تمرین نیمه‌کاره",
};

// ساخت خلاصه‌ی روز فارسی از details (مثلا «روتین 4/6 · خواب 7.2 ساعت · ...»)
function buildDaySummary(details: any): string {
  const parts: string[] = [];

  if (details.routine) {
    parts.push(`روتین ${details.routine.done}/${details.routine.total}`);
  }

  if (details.sleep) {
    const hours = details.sleep.hours ?? "-";
    parts.push(`خواب ${hours} ساعت`);
    if (details.sleep.sleptAt && details.sleep.wokeAt) {
      parts.push(`از ${details.sleep.sleptAt} تا ${details.sleep.wokeAt}`);
    }
  }

  if (details.fitness) {
    const status = fitnessStatusMap[details.fitness.status] || details.fitness.status;
    parts.push(status);
  }

  if (details.nutrition) {
    const kcal = details.nutrition.kcal;
    const target = details.nutrition.target || "-";
    parts.push(`کالری ${kcal}/${target}`);
  }

  if (details.trading) {
    parts.push(`${details.trading.count} معامله`);
  }

  if (details.tasks) {
    parts.push(`کارها ${details.tasks.done}/${details.tasks.due}`);
  }

  if (details.learning) {
    parts.push(`${details.learning.steps} مرحله`);
  }

  return parts.join(" · ");
}

// رنگ تاثیر بخش بر اساس tone
function getToneColor(tone?: string): string {
  switch (tone) {
    case "good":
      return "#00A86B";
    case "bad":
      return "#d94545";
    default:
      return "#666";
  }
}

// علامت +/- کنار عدد در متن راست‌به‌چپ می‌پره اون طرف («12+»)؛ با
// LRI/PDI جدا می‌شه تا همون «+12» دیده بشه
function ltr(s: string): string {
  return `\u2066${s}\u2069`;
}

// فرمت درصد تغییر (delta)
function formatDelta(delta: number | null): { symbol: string; text: string; color: string } {
  if (delta === null || delta === 0) {
    return { symbol: "", text: "مثل هفته‌ی قبل", color: "#666" };
  }
  if (delta > 0) {
    return { symbol: "▲", text: ltr(`+${delta}`), color: "#00A86B" };
  }
  return { symbol: "▼", text: ltr(`${delta}`), color: "#d94545" };
}

export function renderWeeklyLetterEmail(
  data: WeeklyLetterData,
  opts: { url: string; siteUrl: string }
): { subject: string; html: string; text: string } {
  const brandName = escapeHtml(BRAND_FA);
  const ctaUrl = sanitizeUrl(opts.url);
  const prefsUrl = sanitizeUrl(`${opts.siteUrl}/analysis/weekly/letters`);

  // Subject line
  const subject = `هفته‌نامه‌ی شماره ${data.issueNo} | ${escapeHtml(data.weekLabel)} | ${brandName}`;

  // ===== Text version (plain text) =====
  // توجه: text ورژنی ساده است ولی باز هم باید داینامیک‌ها را escape کنیم
  // تا هیچ injection نباشه، حتی اگر ایمیل کلاینت با plain-text باشه.
  const textLines: string[] = [
    brandName,
    "",
    `هفته‌نامه‌ی شماره ${data.issueNo}`,
    escapeHtml(data.weekLabel),
    "",
    `امتیاز: ${data.overall.score ?? "-"}${data.overall.grade ? ` (${data.overall.grade})` : ""}`,
    ...(data.overall.delta !== null
      ? [`تغییر: ${formatDelta(data.overall.delta).text}`]
      : []),
    "",
    escapeHtml(data.headline),
    "",
    escapeHtml(data.intro),
    "",
  ];

  if (data.archetype) {
    textLines.push(`${escapeHtml(data.archetype.title)}: ${escapeHtml(data.archetype.description)}`);
    textLines.push("");
  }

  if (data.numbers.length > 0) {
    textLines.push("اعداد هفته:");
    data.numbers.forEach((n) => {
      const unit = n.unit ? ` ${escapeHtml(n.unit)}` : "";
      textLines.push(`  ${escapeHtml(n.label)}: ${escapeHtml(n.value)}${unit}`);
      if (n.hint) {
        textLines.push(`    (${escapeHtml(n.hint)})`);
      }
    });
    textLines.push("");
  }

  if (data.days.length > 0) {
    textLines.push("روزبه‌روز:");
    data.days.forEach((day) => {
      const score = day.score !== null ? ` - امتیاز ${day.score}` : "";
      const summary = buildDaySummary(day.details);
      textLines.push(`  ${escapeHtml(day.weekday)}${score}: ${escapeHtml(summary)}`);
    });
    textLines.push("");
  }

  if (data.wins.length > 0) {
    textLines.push("بردهای هفته:");
    data.wins.forEach((w) => {
      textLines.push(`  • ${escapeHtml(w)}`);
    });
    textLines.push("");
  }

  if (data.improve.length > 0) {
    textLines.push("جای پیشرفت:");
    data.improve.forEach((i) => {
      textLines.push(`  • ${escapeHtml(i)}`);
    });
    textLines.push("");
  }

  if (data.ai) {
    textLines.push("حرف مربی:");
    textLines.push(escapeHtml(data.ai.summary));
    if (data.ai.recommendations.length > 0) {
      textLines.push("");
      textLines.push("پیشنهادها:");
      data.ai.recommendations.forEach((r) => {
        textLines.push(`  • ${escapeHtml(r.title)}: ${escapeHtml(r.description)}`);
      });
    }
    textLines.push("");
  }

  if (data.nextWeek.focusTitle) {
    textLines.push(escapeHtml(data.nextWeek.focusTitle));
    textLines.push(escapeHtml(data.nextWeek.focusText));
    textLines.push("");
  }

  textLines.push(`خواندن کامل هفته‌نامه: ${opts.url}`);
  textLines.push(`تنظیم ترجیحات: ${prefsUrl}`);
  textLines.push("");
  textLines.push(brandName);

  const text = textLines.join("\n");

  // ===== HTML version (table-based, inline CSS) =====
  const deltaStyling = formatDelta(data.overall.delta);

  let html = `<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f5; font-family: Vazirmatn, Tahoma, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f5; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e6e9e7;">
`;

  // Masthead
  html += `
            <tr>
              <td style="background-color:#06120c; padding:20px 24px; text-align:center;">
                <p style="margin:0 0 8px; font-size:16px; font-weight:700; color:#00A86B;">${brandName}</p>
                <p style="margin:0 0 4px; font-size:18px; font-weight:700; color:#fff;">هفته‌نامه</p>
                <p style="margin:0; font-size:13px; color:#a9b2ae;">شماره ${data.issueNo} • ${escapeHtml(data.weekLabel)}</p>
              </td>
            </tr>
`;

  // Score block
  html += `
            <tr>
              <td style="padding:24px 24px 16px; text-align:center;">
                <div style="display:inline-block; text-align:center;">
                  <div style="font-size:48px; font-weight:700; color:#06120c; letter-spacing:-1px;">
                    ${data.overall.score !== null ? data.overall.score : "-"}
                  </div>
                  ${
                    data.overall.grade
                      ? `<div style="font-size:18px; color:#666; margin-top:4px;">${data.overall.grade}</div>`
                      : ""
                  }
                  ${
                    deltaStyling.symbol
                      ? `<div style="font-size:14px; color:${deltaStyling.color}; margin-top:6px;"><span style="font-size:16px;">${deltaStyling.symbol}</span> ${deltaStyling.text}</div>`
                      : ""
                  }
                </div>
              </td>
            </tr>
`;

  // Headline and intro
  html += `
            <tr>
              <td style="padding:0 24px 12px; text-align:center;">
                <h1 style="margin:0; font-size:20px; font-weight:700; color:#06120c; line-height:1.4;">
                  ${escapeHtml(data.headline)}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 24px; text-align:center;">
                <p style="margin:0; font-size:14px; color:#5b6660; line-height:1.6; direction:rtl;">
                  ${escapeHtml(data.intro)}
                </p>
              </td>
            </tr>
`;

  // Archetype
  if (data.archetype) {
    html += `
            <tr>
              <td style="padding:0 24px 24px; text-align:center;">
                <div style="background-color:#f0f9f5; border:1px solid #cdeee0; border-radius:8px; padding:16px;">
                  <p style="margin:0 0 6px; font-size:13px; font-weight:700; color:#00A86B; direction:rtl;">
                    ${escapeHtml(data.archetype.title)}
                  </p>
                  <p style="margin:0; font-size:13px; color:#5b6660; line-height:1.5; direction:rtl;">
                    ${escapeHtml(data.archetype.description)}
                  </p>
                </div>
              </td>
            </tr>
`;
  }

  // Numbers (2-column grid)
  if (data.numbers.length > 0) {
    html += `
            <tr>
              <td style="padding:24px 24px 16px; text-align:center;">
                <p style="margin:0 0 16px; font-size:14px; font-weight:700; color:#06120c; direction:rtl;">اعداد هفته</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
`;
    for (let i = 0; i < data.numbers.length; i += 2) {
      html += `
                  <tr>
                    <td width="50%" style="padding:8px 8px; text-align:center; border-radius:6px; background-color:#f9faf9;">
                      <div style="font-size:18px; font-weight:700; color:#00A86B;">
                        ${escapeHtml(data.numbers[i].value)}
                      </div>
                      <div style="font-size:12px; color:#666; margin-top:2px;">
                        ${escapeHtml(data.numbers[i].label)}
                      </div>
                      ${
                        data.numbers[i].unit
                          ? `<div style="font-size:11px; color:#999; margin-top:2px;">${escapeHtml(data.numbers[i].unit!)}</div>`
                          : ""
                      }
                      ${
                        data.numbers[i].hint
                          ? `<div style="font-size:11px; color:#999; margin-top:4px;">${escapeHtml(data.numbers[i].hint!)}</div>`
                          : ""
                      }
                    </td>
                    <td width="50%" style="padding:8px 8px; text-align:center; border-radius:6px; background-color:#f9faf9;">
                      ${
                        data.numbers[i + 1]
                          ? `
                      <div style="font-size:18px; font-weight:700; color:#00A86B;">
                        ${escapeHtml(data.numbers[i + 1].value)}
                      </div>
                      <div style="font-size:12px; color:#666; margin-top:2px;">
                        ${escapeHtml(data.numbers[i + 1].label)}
                      </div>
                      ${
                        data.numbers[i + 1].unit
                          ? `<div style="font-size:11px; color:#999; margin-top:2px;">${escapeHtml(data.numbers[i + 1].unit!)}</div>`
                          : ""
                      }
                      ${
                        data.numbers[i + 1].hint
                          ? `<div style="font-size:11px; color:#999; margin-top:4px;">${escapeHtml(data.numbers[i + 1].hint!)}</div>`
                          : ""
                      }
                    `
                          : ""
                      }
                    </td>
                  </tr>
`;
    }
    html += `
                </table>
              </td>
            </tr>
`;
  }

  // Days table (روزبه‌روز)
  if (data.days.length > 0) {
    html += `
            <tr>
              <td style="padding:24px 24px 16px; text-align:center;">
                <p style="margin:0 0 16px; font-size:14px; font-weight:700; color:#06120c; direction:rtl;">روزبه‌روز</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
`;
    data.days.forEach((day) => {
      const summary = buildDaySummary(day.details);
      const scoreDisplay = day.score !== null ? `${day.score}` : "-";
      const scoreColor = day.score !== null && day.score >= 70 ? "#00A86B" : day.score !== null && day.score < 40 ? "#d94545" : "#666";

      html += `
                  <tr style="border-bottom:1px solid #eef1ef;">
                    <td style="padding:12px 8px; text-align:center; direction:rtl; font-size:13px; color:#5b6660;">
                      ${escapeHtml(day.weekday)}
                    </td>
                    <td style="padding:12px 8px; text-align:center; font-size:13px; font-weight:700; color:${scoreColor};">
                      ${scoreDisplay}
                    </td>
                    <td style="padding:12px 8px; text-align:right; direction:rtl; font-size:12px; color:#5b6660; line-height:1.4;">
                      ${escapeHtml(summary)}
                    </td>
                  </tr>
`;
    });
    html += `
                </table>
              </td>
            </tr>
`;
  }

  // Wins
  if (data.wins.length > 0) {
    html += `
            <tr>
              <td style="padding:24px 24px 16px; text-align:right; direction:rtl;">
                <p style="margin:0 0 12px; font-size:14px; font-weight:700; color:#06120c;">بردهای هفته</p>
                <ul style="margin:0; padding-right:20px; color:#5b6660; font-size:13px; line-height:1.6;">
`;
    data.wins.forEach((w) => {
      html += `
                  <li style="margin-bottom:6px; direction:rtl;">${escapeHtml(w)}</li>
`;
    });
    html += `
                </ul>
              </td>
            </tr>
`;
  }

  // Improve
  if (data.improve.length > 0) {
    html += `
            <tr>
              <td style="padding:0 24px 24px; text-align:right; direction:rtl;">
                <p style="margin:0 0 12px; font-size:14px; font-weight:700; color:#06120c;">جای پیشرفت</p>
                <ul style="margin:0; padding-right:20px; color:#5b6660; font-size:13px; line-height:1.6;">
`;
    data.improve.forEach((i) => {
      html += `
                  <li style="margin-bottom:6px; direction:rtl;">${escapeHtml(i)}</li>
`;
    });
    html += `
                </ul>
              </td>
            </tr>
`;
  }

  // AI Coach
  if (data.ai) {
    html += `
            <tr>
              <td style="padding:24px 24px 16px; text-align:right; direction:rtl;">
                <p style="margin:0 0 12px; font-size:14px; font-weight:700; color:#06120c;">حرف مربی</p>
                <p style="margin:0; font-size:13px; color:#5b6660; line-height:1.6;">
                  ${escapeHtml(data.ai.summary)}
                </p>
`;
    if (data.ai.recommendations.length > 0) {
      html += `
                <p style="margin:12px 0 0; font-size:12px; font-weight:700; color:#06120c; direction:rtl;">پیشنهادها:</p>
                <ul style="margin:8px 0 0; padding-right:20px; color:#5b6660; font-size:12px; line-height:1.5;">
`;
      data.ai.recommendations.slice(0, 3).forEach((r) => {
        html += `
                  <li style="margin-bottom:4px; direction:rtl;"><strong>${escapeHtml(r.title)}:</strong> ${escapeHtml(r.description)}</li>
`;
      });
      html += `
                </ul>
`;
    }
    html += `
              </td>
            </tr>
`;
  }

  // Next week focus
  if (data.nextWeek.focusTitle) {
    html += `
            <tr>
              <td style="padding:24px 24px 16px; text-align:right; direction:rtl;">
                <p style="margin:0 0 8px; font-size:14px; font-weight:700; color:#06120c;">
                  ${escapeHtml(data.nextWeek.focusTitle)}
                </p>
                <p style="margin:0; font-size:13px; color:#5b6660; line-height:1.6;">
                  ${escapeHtml(data.nextWeek.focusText)}
                </p>
              </td>
            </tr>
`;
  }

  // CTA Button
  html += `
            <tr>
              <td style="padding:28px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td align="center">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="border-radius:6px; background-color:#00A86B;">
                            <a href="${ctaUrl}" style="display:inline-block; padding:12px 28px; color:#fff; text-decoration:none; font-weight:700; font-size:14px; direction:rtl;">
                              خواندن کامل هفته‌نامه
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
`;

  // Footer
  html += `
            <tr>
              <td style="padding:16px 24px; border-top:1px solid #eef1ef; text-align:center;">
                <p style="margin:0; font-size:12px; color:#8b9791; direction:rtl;">
                  می‌خواهی ترجیحات ایمیل‌های هفتگی‌ات را تغییر بدهی؟
                  <a href="${prefsUrl}" style="color:#00A86B; text-decoration:none; font-weight:600;">تنظیم ارسال ایمیلی</a>
                </p>
                <p style="margin:8px 0 0; font-size:11px; color:#a9b2ae;">${brandName}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
