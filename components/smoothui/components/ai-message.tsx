"use client";

import { cn } from "@/lib/utils";
import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

// منبع: SmoothUI (ai-message). تغییرهای عمدی نسبت به نسخه‌ی اصلی:
//   • کلاس‌های رنگِ shadcn (`text-muted-foreground`, `bg-muted`, `bg-foreground`)
//     به توکن‌های همین پروژه نگاشت شده‌اند — این پروژه آن توکن‌ها را ندارد و
//     بدونِ نگاشت، متن و حباب‌ها بی‌رنگ رندر می‌شدند.
//   • حبابِ کاربر به‌جای پرشدنِ تخت، همان شیشه‌ی اکسنتِ اپ را می‌گیرد تا با
//     بقیه‌ی گفت‌وگوهای اپ یکدست بماند.

const COPIED_RESET_MS = 1600;
const ACTION_STAGGER_MS = 30;

// استایلِ ردیفِ کنش‌ها به `app/globals.css` منتقل شد.
//
// نسخه‌ی اصلی آن را با یک <style> داخلِ خودِ کامپوننت تزریق می‌کرد؛ چون این
// کامپوننت به‌ازای *هر پیام* رندر می‌شود، یک گفت‌وگوی ده‌پیامی ده نسخه‌ی
// یکسان از همان قوانین را توی DOM می‌گذاشت. رفتار دقیقا همان است.

export type AIMessageAuthor = "user" | "assistant";

export type AIMessageProps = {
  /** Rendered to the side of the bubble — an avatar or an orb. */
  avatar?: ReactNode;
  /**
   * Draw the tinted bubble. Turn it off for assistant turns that carry their own
   * surfaces — reasoning traces, tool calls, diffs — where a bubble around a
   * stack of cards reads as a box inside a box.
   */
  bubble?: boolean;
  children: ReactNode;
  className?: string;
  /** Plain text handed to the clipboard. Omit to hide the copy action. */
  copyText?: string;
  /**
   * Who wrote it. Named `from` rather than `role` on purpose: `role` is an ARIA
   * attribute, and a component prop of that name misleads both readers and
   * accessibility linters.
   */
  from?: AIMessageAuthor;
  onRetry?: () => void;
  onVote?: (vote: "up" | "down") => void;
  /** Preformatted timestamp, e.g. "14:32". */
  timestamp?: string;
};

/**
 * A chat message with actions that stay out of the way.
 *
 * The action row slides out of the bubble's own edge rather than fading in from
 * nowhere, so it reads as belonging to that message. It is revealed on hover and
 * on focus-within, because a hover-only control row is unreachable by keyboard.
 */
const AIMessage = ({
  avatar,
  bubble = true,
  children,
  className,
  copyText,
  onRetry,
  onVote,
  from = "assistant",
  timestamp,
}: AIMessageProps) => {
  const [hasCopied, setHasCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  const isUser = from === "user";

  useEffect(() => {
    if (!hasCopied) {
      return;
    }
    const timeout = setTimeout(() => setHasCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timeout);
  }, [hasCopied]);

  const copy = async () => {
    if (!copyText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(copyText);
      setHasCopied(true);
    } catch {
      // A blocked clipboard is not worth interrupting the conversation over.
    }
  };

  const actions = [
    copyText
      ? {
          active: hasCopied,
          icon: hasCopied ? Check : Copy,
          key: "copy",
          label: hasCopied ? "کپی شد" : "کپی",
          onClick: copy,
        }
      : null,
    onRetry
      ? {
          active: false,
          icon: RotateCcw,
          key: "retry",
          label: "دوباره",
          onClick: onRetry,
        }
      : null,
    // Voting on your own message makes no sense, so the feedback pair is
    // assistant-only even when the consumer passes `onVote` for the thread.
    onVote && !isUser
      ? {
          active: vote === "up",
          icon: ThumbsUp,
          key: "up",
          label: "پاسخ خوب بود",
          onClick: () => {
            setVote("up");
            onVote("up");
          },
        }
      : null,
    onVote && !isUser
      ? {
          active: vote === "down",
          icon: ThumbsDown,
          key: "down",
          label: "پاسخ خوب نبود",
          onClick: () => {
            setVote("down");
            onVote("down");
          },
        }
      : null,
  ].filter((action): action is NonNullable<typeof action> => action !== null);

  return (
    <div
      className={cn(
        // The reveal is scoped to this class rather than Tailwind's `group`, so a
        // `group` ancestor elsewhere on the page cannot reveal every row at once.
        "ai-message-root flex w-full gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {avatar ? <div className="mt-0.5 shrink-0">{avatar}</div> : null}

      <div className={cn("flex min-w-0 flex-col gap-1", isUser && "items-end")}>
        <div
          className={cn(
            "w-fit max-w-prose text-[12.5px] leading-loose",
            bubble && "rounded-2xl px-3.5 py-2.5",
            bubble && isUser && "routine-ai-bubble-user rounded-br-md",
            bubble && !isUser && "routine-ai-bubble-bot rounded-bl-md",
            !bubble && "text-dash-text"
          )}
        >
          {children}
        </div>

        <div
          className={cn(
            "flex items-center gap-1 px-1",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          {/* The timestamp comes first so it stays pinned to the edge the
              bubble is anchored to — left for the assistant, right for the
              user. Putting the (always-mounted, invisible) action slots before
              it pushed it toward the middle of the row, where it read as
              floating in nothing. */}
          {timestamp ? (
            <span className="text-dash-muted text-[10px] tabular-nums">
              {timestamp}
            </span>
          ) : null}

          {/* Always mounted, only faded — mounting the row on hover changed its
              height, so every message below jumped as the pointer moved down a
              thread. The reveal is plain CSS rather than a motion `animate`
              target: the group already knows about hover and focus-within, so no
              state, no listeners, and the row cannot get stuck half-revealed. */}
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                aria-label={action.label}
                aria-pressed={action.active}
                className={cn(
                  "ai-message-action cursor-pointer rounded-lg",
                  isUser ? "ai-message-action-user" : "ai-message-action-agent",
                  action.active ? "text-dash-text" : "text-dash-muted hover:text-dash-text"
                )}
                key={action.key}
                onClick={action.onClick}
                style={{ transitionDelay: `${index * ACTION_STAGGER_MS}ms` }}
                type="button"
              >
                <Icon
                  aria-hidden="true"
                  className={
                    action.key === "copy" && hasCopied
                      ? "ai-message-pop"
                      : undefined
                  }
                  key={action.key === "copy" && hasCopied ? "copied" : "idle"}
                  size={14}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AIMessage;
