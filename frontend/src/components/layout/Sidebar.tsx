"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { PencilIcon } from "@/components/ui/icons";
import { ConversationList } from "@/components/conversations/ConversationList";
import { NewChatModal } from "@/components/modals/NewChatModal";
import { NewGroupModal } from "@/components/modals/NewGroupModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { useAuthStore } from "@/store/auth";

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!user) return null;

  return (
    <aside className="flex h-full w-full flex-col border-r border-signal-border dark:border-signal-borderDark bg-white dark:bg-signal-sidebarDark md:w-[380px] md:shrink-0">
      <header className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setSettingsOpen(true)} aria-label="Settings">
          <Avatar name={user.display_name} color={user.avatar_color} size={36} />
        </button>
        <h1 className="text-lg font-semibold">Chats</h1>
        <button
          onClick={() => setNewChatOpen(true)}
          className="rounded-full p-2 text-signal-muted hover:bg-black/5 dark:text-signal-mutedDark dark:hover:bg-white/10"
          aria-label="New chat"
        >
          <PencilIcon className="h-5 w-5" />
        </button>
      </header>

      <ConversationList />

      {newChatOpen && (
        <NewChatModal
          onClose={() => setNewChatOpen(false)}
          onNewGroup={() => {
            setNewChatOpen(false);
            setNewGroupOpen(true);
          }}
        />
      )}
      {newGroupOpen && <NewGroupModal onClose={() => setNewGroupOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </aside>
  );
}
