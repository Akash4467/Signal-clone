"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { GroupIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";
import { api } from "@/lib/api";
import type { Contact, Conversation } from "@/lib/types";
import { useChatStore } from "@/store/chat";
import { useToastStore } from "@/store/toast";

interface NewChatModalProps {
  onClose: () => void;
  onNewGroup: () => void;
}

export function NewChatModal({ onClose, onNewGroup }: NewChatModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useChatStore((s) => s.refresh);
  const openConversation = useChatStore((s) => s.openConversation);
  const toast = useToastStore((s) => s.show);

  useEffect(() => {
    void api.get<Contact[]>("/contacts").then(setContacts).catch(() => {});
  }, []);

  const filtered = contacts.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.user.display_name.toLowerCase().includes(q) ||
      c.user.username.toLowerCase().includes(q) ||
      c.user.phone.includes(q)
    );
  });

  async function startChat(userId: number) {
    setBusy(true);
    try {
      const conversation = await api.post<Conversation>("/conversations", { user_id: userId });
      await refresh();
      await openConversation(conversation.id);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not start chat", "error");
    } finally {
      setBusy(false);
    }
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const contact = await api.post<Contact>("/contacts", { identifier });
      setContacts((prev) => [...prev, contact]);
      setIdentifier("");
      setAdding(false);
      toast(`${contact.user.display_name} added to contacts`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not add contact", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New chat" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-full bg-black/5 dark:bg-white/10 px-3 py-2">
          <SearchIcon className="h-4 w-4 text-signal-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts"
            className="w-full bg-transparent text-sm outline-none"
            autoFocus
          />
        </div>

        <button
          onClick={onNewGroup}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-signal-blue text-white">
            <GroupIcon className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium">New group</span>
        </button>

        {adding ? (
          <form onSubmit={addContact} className="flex gap-2">
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Phone or username"
              className="flex-1 rounded-lg border border-signal-border dark:border-signal-borderDark bg-transparent px-3 py-2 text-sm outline-none focus:border-signal-blue"
              autoFocus
            />
            <button
              disabled={busy || !identifier.trim()}
              className="rounded-lg bg-signal-blue px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Add
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-signal-blue text-white">
              <PlusIcon className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium">Add contact</span>
          </button>
        )}

        <div className="border-t border-signal-border dark:border-signal-borderDark pt-2">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-signal-muted dark:text-signal-mutedDark">
              {contacts.length === 0 ? "No contacts yet" : "No matches"}
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                disabled={busy}
                onClick={() => void startChat(c.user.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
              >
                <Avatar name={c.user.display_name} color={c.user.avatar_color} size={40} online={c.user.online} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.user.display_name}</p>
                  <p className="truncate text-xs text-signal-muted dark:text-signal-mutedDark">
                    @{c.user.username}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
