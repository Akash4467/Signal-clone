"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { LockIcon } from "@/components/ui/icons";
import { formatDaySeparator, sameDay } from "@/lib/format";
import type { Message } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";

interface MessageListProps {
  messages: Message[];
  isGroup: boolean;
  onReply: (message: Message) => void;
}

export function MessageList({ messages, isGroup, onReply }: MessageListProps) {
  const me = useAuthStore((s) => s.user);
  const loadOlder = useChatStore((s) => s.loadOlder);
  const activeId = useChatStore((s) => s.activeId);
  const hasMore = useChatStore((s) => (s.activeId !== null ? s.hasMore[s.activeId] : false));

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [activeId, lastMessageId]);

  async function handleScroll() {
    const el = containerRef.current;
    if (!el || el.scrollTop > 60 || !hasMore) return;
    const prevHeight = el.scrollHeight;
    await loadOlder();
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight - prevHeight;
    });
  }

  return (
    <div
      ref={containerRef}
      onScroll={() => void handleScroll()}
      className="flex-1 overflow-y-auto scrollbar-thin py-3"
    >
      <div className="mx-auto mb-4 mt-2 flex max-w-md items-center justify-center gap-1.5 rounded-xl bg-black/5 dark:bg-white/5 px-4 py-2 text-center text-[11px] text-signal-muted dark:text-signal-mutedDark">
        <LockIcon className="h-3 w-3 shrink-0" />
        <span>Messages are end-to-end encrypted. Only people in this chat can read them.</span>
      </div>

      <div className="space-y-1">
        {messages.map((message, i) => {
          const prev = messages[i - 1];
          const isMine = message.sender.id === me?.id;
          const newDay = !prev || !sameDay(prev.created_at, message.created_at);
          const showSender = isGroup && !isMine && (!prev || prev.sender.id !== message.sender.id || newDay);

          return (
            <div key={message.client_key ?? message.id}>
              {newDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 text-[11px] font-medium text-signal-muted dark:text-signal-mutedDark">
                    {formatDaySeparator(message.created_at)}
                  </span>
                </div>
              )}
              <MessageBubble message={message} isMine={isMine} showSender={showSender} onReply={onReply} />
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
