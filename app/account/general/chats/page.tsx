"use client";

import { AccountPageHead } from "@/components/AccountUI";
import { MentorChatHistorySettings } from "@/components/MentorChatHistorySettings";
import { tr } from "@/lib/i18n";

// «تنظیمات › سابقه‌ی گفت‌وگو» — هر بخش صفحه‌ی خودش؛ فهرست بخش‌ها در /account/general
// پاک کردن فقط برای خود کاربر است (lib/mentorChatHistory.ts).
export default function ChatHistorySettingsPage() {
  return (
    <section>
      <AccountPageHead title={tr("سابقه‌ی گفت‌وگو", "Chat history")} backHref="/account/general" backLabel={tr("تنظیمات", "Settings")} />
      <MentorChatHistorySettings showEmpty />
    </section>
  );
}
