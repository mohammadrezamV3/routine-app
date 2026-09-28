"use client";

import { AccountPageHead } from "@/components/AccountUI";
import { MentorChatHistorySettings } from "@/components/MentorChatHistorySettings";

// «تنظیمات › سابقه‌ی گفت‌وگو» — هر بخش صفحه‌ی خودش؛ فهرست بخش‌ها در /account/general
// پاک کردن فقط برای خودِ کاربر است (lib/mentorChatHistory.ts).
export default function ChatHistorySettingsPage() {
  return (
    <section>
      <AccountPageHead title="سابقه‌ی گفت‌وگو" backHref="/account/general" backLabel="تنظیمات" />
      <MentorChatHistorySettings showEmpty />
    </section>
  );
}
