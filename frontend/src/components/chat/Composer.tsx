"use client";

import { useEffect, useRef, useState } from "react";
import { SendIcon, PlusIcon } from "@/components/ui/icons";
import { wsClient } from "@/lib/ws";
import type { Message } from "@/lib/types";
import { useChatStore } from "@/store/chat";
import { useToastStore } from "@/store/toast";

interface ComposerProps {
  replyTo: Message | null;
  onClearReply: () => void;
}

export function Composer({ replyTo, onClearReply }: ComposerProps) {
  const [text, setText] = useState("");
  const sendMessage = useChatStore((s) => s.sendMessage);
  const activeId = useChatStore((s) => s.activeId);
  const toast = useToastStore((s) => s.show);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    setText("");
    onClearReply();
    textareaRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  function handleChange(value: string) {
    setText(value);
    const now = Date.now();
    if (activeId !== null && now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      wsClient.sendTyping(activeId);
    }
  }

  async function submit() {
    const content = text.trim();
    if (!content) return;
    setText("");
    const replyId = replyTo?.id;
    onClearReply();
    await sendMessage(content, replyId);
  }

  return (
    <div className="border-t border-signal-border dark:border-signal-borderDark bg-white dark:bg-signal-sidebarDark px-3 py-2.5">
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg border-l-4 border-signal-blue bg-black/5 dark:bg-white/5 px-3 py-1.5">
          <div className="min-w-0 text-xs">
            <p className="font-semibold text-signal-blue">{replyTo.sender.display_name}</p>
            <p className="truncate text-signal-muted dark:text-signal-mutedDark">{replyTo.content}</p>
          </div>
          <button
            onClick={onClearReply}
            className="ml-2 shrink-0 rounded-full p-1 text-signal-muted hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Cancel reply"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={() => toast("Attachments coming soon")}
          className="mb-1 shrink-0 rounded-full p-2 text-signal-muted hover:bg-black/5 dark:text-signal-mutedDark dark:hover:bg-white/10"
          aria-label="Attach"
        >
          <PlusIcon className="h-5 w-5" />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Message"
          rows={1}
          className="max-h-32 flex-1 resize-none rounded-2xl bg-black/5 dark:bg-white/10 px-4 py-2.5 text-sm outline-none placeholder:text-signal-muted dark:placeholder:text-signal-mutedDark"
          style={{ minHeight: 42 }}
        />

        <button
          onClick={() => void submit()}
          disabled={!text.trim()}
          className="mb-0.5 shrink-0 rounded-full bg-signal-blue p-2.5 text-white transition-opacity hover:bg-signal-blueDark disabled:opacity-40"
          aria-label="Send"
        >
          <SendIcon className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}
