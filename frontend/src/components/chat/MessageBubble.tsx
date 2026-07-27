"use client";

import { useState } from "react";
import { ReceiptTicks } from "./ReceiptTicks";
import { ReplyIcon } from "@/components/ui/icons";
import { formatTime } from "@/lib/format";
import type { Message } from "@/lib/types";
import { useChatStore } from "@/store/chat";
import { useAuthStore } from "@/store/auth";

const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢"];

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showSender: boolean;
  onReply: (message: Message) => void;
}

export function MessageBubble({ message, isMine, showSender, onReply }: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const toggleReaction = useChatStore((s) => s.toggleReaction);
  const me = useAuthStore((s) => s.user);

  const reactionGroups = message.reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className={`group flex ${isMine ? "justify-end" : "justify-start"} px-4`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPickerOpen(false);
      }}
    >
      <div className={`relative max-w-[75%] sm:max-w-[60%] ${isMine ? "items-end" : "items-start"}`}>
        {(hovered || pickerOpen) && (
          <div
            className={`absolute -top-8 z-10 flex items-center gap-0.5 rounded-full bg-white dark:bg-signal-sidebarDark shadow-md border border-signal-border dark:border-signal-borderDark px-1.5 py-1 ${
              isMine ? "right-0" : "left-0"
            }`}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className="rounded-full px-1 text-sm hover:scale-125 transition-transform"
                onClick={() => {
                  void toggleReaction(message.id, emoji);
                  setPickerOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
            <button
              className="ml-0.5 rounded-full p-1 text-signal-muted hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => onReply(message)}
              title="Reply"
            >
              <ReplyIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div
          className={`rounded-2xl px-3 py-2 text-sm ${
            isMine
              ? "rounded-br-md bg-signal-bubble text-white"
              : "rounded-bl-md bg-signal-bubbleIn text-signal-text dark:bg-signal-bubbleInDark dark:text-signal-textDark"
          }`}
        >
          {showSender && !isMine && (
            <p className="mb-0.5 text-xs font-semibold" style={{ color: message.sender.avatar_color }}>
              {message.sender.display_name}
            </p>
          )}

          {message.reply_to && (
            <div
              className={`mb-1.5 rounded-lg border-l-4 px-2 py-1 text-xs ${
                isMine
                  ? "border-white/60 bg-white/15 text-white/90"
                  : "border-signal-blue bg-black/5 dark:bg-white/10"
              }`}
            >
              <p className="font-semibold">{message.reply_to.sender_name}</p>
              <p className="truncate">{message.reply_to.content}</p>
            </div>
          )}

          <p className="whitespace-pre-wrap break-words">{message.content}</p>

          <div
            className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
              isMine ? "text-white/70" : "text-signal-muted dark:text-signal-mutedDark"
            }`}
          >
            <span>{formatTime(message.created_at)}</span>
            {isMine && <ReceiptTicks status={message.status} light />}
          </div>
        </div>

        {Object.keys(reactionGroups).length > 0 && (
          <div className={`-mt-1.5 flex gap-1 ${isMine ? "justify-end pr-1" : "justify-start pl-1"}`}>
            {Object.entries(reactionGroups).map(([emoji, count]) => {
              const mine = message.reactions.some((r) => r.emoji === emoji && r.user_id === me?.id);
              return (
                <button
                  key={emoji}
                  onClick={() => void toggleReaction(message.id, emoji)}
                  className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs shadow-sm ${
                    mine
                      ? "border-signal-blue bg-signal-blue/10"
                      : "border-signal-border bg-white dark:border-signal-borderDark dark:bg-signal-sidebarDark"
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-[10px]">{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
