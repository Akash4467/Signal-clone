"use client";

import { Avatar } from "@/components/ui/Avatar";
import { ReceiptTicks } from "@/components/chat/ReceiptTicks";
import { formatListTimestamp } from "@/lib/format";
import type { ConversationSummary } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

interface ConversationItemProps {
  conversation: ConversationSummary;
  active: boolean;
  typingNames: string[];
  onClick: () => void;
}

export function ConversationItem({ conversation, active, typingNames, onClick }: ConversationItemProps) {
  const me = useAuthStore((s) => s.user);
  const last = conversation.last_message;
  const isMine = last?.sender.id === me?.id;

  let preview: React.ReactNode = <span className="italic">No messages yet</span>;
  if (typingNames.length > 0) {
    preview = <span className="text-signal-blue">typing…</span>;
  } else if (last) {
    preview = (
      <span className="flex items-center gap-1 overflow-hidden">
        {isMine && <ReceiptTicks status={last.status} />}
        <span className="truncate">
          {conversation.is_group && !isMine ? `${last.sender.display_name.split(" ")[0]}: ` : ""}
          {last.content}
        </span>
      </span>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        active
          ? "bg-signal-blue/10 dark:bg-signal-blue/20"
          : "hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      <Avatar
        name={conversation.name}
        color={conversation.avatar_color}
        size={48}
        online={conversation.other_user?.online}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{conversation.name}</span>
          <span className="shrink-0 text-xs text-signal-muted dark:text-signal-mutedDark">
            {last ? formatListTimestamp(last.created_at) : ""}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 truncate text-xs text-signal-muted dark:text-signal-mutedDark">
            {preview}
          </div>
          {conversation.unread_count > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-signal-blue px-1.5 text-[11px] font-semibold text-white">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
