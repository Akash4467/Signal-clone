"use client";

import { useMemo, useState } from "react";
import { ConversationItem } from "./ConversationItem";
import { SearchIcon } from "@/components/ui/icons";
import { useChatStore } from "@/store/chat";
import { useAuthStore } from "@/store/auth";

export function ConversationList() {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const typing = useChatStore((s) => s.typing);
  const openConversation = useChatStore((s) => s.openConversation);
  const me = useAuthStore((s) => s.user);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "groups">("all");

  const filtered = useMemo(() => {
    let list = conversations;
    if (filter === "unread") list = list.filter((c) => c.unread_count > 0);
    if (filter === "groups") list = list.filter((c) => c.is_group);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.other_user?.username.toLowerCase().includes(q) ||
          c.last_message?.content.toLowerCase().includes(q)
      );
    }
    return list;
  }, [conversations, query, filter]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-full bg-black/5 dark:bg-white/10 px-3 py-2">
          <SearchIcon className="h-4 w-4 text-signal-muted dark:text-signal-mutedDark" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm outline-none placeholder:text-signal-muted dark:placeholder:text-signal-mutedDark"
          />
        </div>
        <div className="mt-2 flex gap-1.5">
          {(["all", "unread", "groups"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-signal-blue/15 text-signal-blue dark:bg-signal-blue/25"
                  : "bg-black/5 text-signal-muted hover:bg-black/10 dark:bg-white/10 dark:text-signal-mutedDark dark:hover:bg-white/15"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-signal-muted dark:text-signal-mutedDark">
            {query ? "No results" : "No conversations yet — start one with the pencil button."}
          </p>
        ) : (
          filtered.map((c) => {
            const typingIds = Object.keys(typing[c.id] ?? {}).map(Number).filter((id) => id !== me?.id);
            return (
              <ConversationItem
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                typingNames={typingIds.map(String)}
                onClick={() => void openConversation(c.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
