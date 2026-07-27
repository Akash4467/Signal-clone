"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { CheckIcon } from "@/components/ui/icons";
import { api } from "@/lib/api";
import type { Contact, Conversation } from "@/lib/types";
import { useChatStore } from "@/store/chat";
import { useToastStore } from "@/store/toast";

export function NewGroupModal({ onClose }: { onClose: () => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const refresh = useChatStore((s) => s.refresh);
  const openConversation = useChatStore((s) => s.openConversation);
  const toast = useToastStore((s) => s.show);

  useEffect(() => {
    void api.get<Contact[]>("/contacts").then(setContacts).catch(() => {});
  }, []);

  function toggle(userId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const group = await api.post<Conversation>("/groups", {
        name,
        member_ids: Array.from(selected),
      });
      await refresh();
      await openConversation(group.id);
      toast(`Group "${name}" created`, "success");
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create group", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New group" onClose={onClose}>
      <form onSubmit={createGroup} className="space-y-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          className="w-full rounded-lg border border-signal-border dark:border-signal-borderDark bg-transparent px-3 py-2.5 text-sm outline-none focus:border-signal-blue"
          autoFocus
          required
        />

        <div>
          <p className="mb-1 text-xs font-medium text-signal-muted dark:text-signal-mutedDark">
            Members · {selected.size} selected
          </p>
          <div className="max-h-64 overflow-y-auto scrollbar-thin">
            {contacts.length === 0 ? (
              <p className="py-4 text-center text-sm text-signal-muted dark:text-signal-mutedDark">
                Add contacts first to create a group
              </p>
            ) : (
              contacts.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggle(c.user.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <Avatar name={c.user.display_name} color={c.user.avatar_color} size={36} />
                  <span className="flex-1 truncate text-sm">{c.user.display_name}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      selected.has(c.user.id)
                        ? "border-signal-blue bg-signal-blue text-white"
                        : "border-signal-muted"
                    }`}
                  >
                    {selected.has(c.user.id) && <CheckIcon className="h-3.5 w-3.5" />}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <button
          disabled={busy || !name.trim() || selected.size === 0}
          className="w-full rounded-full bg-signal-blue py-2.5 text-sm font-semibold text-white hover:bg-signal-blueDark disabled:opacity-50"
        >
          Create group
        </button>
      </form>
    </Modal>
  );
}
