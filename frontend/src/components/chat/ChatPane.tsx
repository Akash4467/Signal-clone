"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { BackIcon, LockIcon, MoreIcon, PhoneIcon, VideoIcon } from "@/components/ui/icons";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { TypingIndicator } from "./TypingIndicator";
import { GroupInfoModal } from "@/components/modals/GroupInfoModal";
import { formatLastSeen } from "@/lib/format";
import type { Message } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import { useToastStore } from "@/store/toast";

const EMPTY_MESSAGES: Message[] = [];
const EMPTY_TYPING: Record<number, number> = {};

export function ChatPane() {
  const detail = useChatStore((s) => s.activeDetail);
  const activeId = useChatStore((s) => s.activeId);
  const messages = useChatStore((s) => (s.activeId !== null ? s.messages[s.activeId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES));
  const typing = useChatStore((s) => (s.activeId !== null ? s.typing[s.activeId] ?? EMPTY_TYPING : EMPTY_TYPING));
  const closeConversation = useChatStore((s) => s.closeConversation);
  const me = useAuthStore((s) => s.user);
  const toast = useToastStore((s) => s.show);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);

  if (activeId === null || !detail) {
    return (
      <div className="hidden flex-1 flex-col items-center justify-center gap-3 bg-signal-sidebar dark:bg-signal-bgDark md:flex">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-signal-blue/10">
          <svg viewBox="0 0 24 24" className="h-10 w-10 fill-signal-blue">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2z" />
          </svg>
        </div>
        <p className="text-sm text-signal-muted dark:text-signal-mutedDark">
          Select a chat to start messaging
        </p>
        <p className="flex items-center gap-1 text-xs text-signal-muted dark:text-signal-mutedDark">
          <LockIcon className="h-3 w-3" /> Your messages are private (encryption mocked)
        </p>
      </div>
    );
  }

  const typingIds = Object.keys(typing).map(Number).filter((id) => id !== me?.id);
  const subtitle = detail.is_group
    ? `${detail.members.length} members`
    : detail.other_user?.online
      ? "Online"
      : formatLastSeen(detail.other_user?.last_seen ?? null);

  return (
    <div className="flex flex-1 flex-col bg-signal-sidebar dark:bg-signal-bgDark">
      <header className="flex items-center gap-3 border-b border-signal-border dark:border-signal-borderDark bg-white dark:bg-signal-sidebarDark px-3 py-2.5">
        <button
          onClick={closeConversation}
          className="rounded-full p-1.5 text-signal-muted hover:bg-black/5 dark:hover:bg-white/10 md:hidden"
          aria-label="Back"
        >
          <BackIcon className="h-5 w-5" />
        </button>

        <button
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => detail.is_group && setGroupInfoOpen(true)}
        >
          <Avatar
            name={detail.name}
            color={detail.avatar_color}
            size={40}
            online={detail.other_user?.online}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{detail.name}</p>
            <p className={`truncate text-xs ${subtitle === "Online" ? "text-signal-blue" : "text-signal-muted dark:text-signal-mutedDark"}`}>
              {subtitle}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 text-signal-muted dark:text-signal-mutedDark">
          <button
            onClick={() => toast("Voice calls coming soon")}
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Voice call"
          >
            <PhoneIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => toast("Video calls coming soon")}
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Video call"
          >
            <VideoIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => (detail.is_group ? setGroupInfoOpen(true) : toast("Chat settings coming soon"))}
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="More"
          >
            <MoreIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <MessageList messages={messages} isGroup={detail.is_group} onReply={setReplyTo} />
      <TypingIndicator typingUserIds={typingIds} members={detail.members} />
      <Composer replyTo={replyTo} onClearReply={() => setReplyTo(null)} />

      {groupInfoOpen && <GroupInfoModal onClose={() => setGroupInfoOpen(false)} />}
    </div>
  );
}