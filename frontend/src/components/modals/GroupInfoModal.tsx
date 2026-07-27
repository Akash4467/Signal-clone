"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { PlusIcon } from "@/components/ui/icons";
import { api } from "@/lib/api";
import type { Contact } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import { useToastStore } from "@/store/toast";

export function GroupInfoModal({ onClose }: { onClose: () => void }) {
  const detail = useChatStore((s) => s.activeDetail);
  const refreshDetail = useChatStore((s) => s.refreshDetail);
  const refresh = useChatStore((s) => s.refresh);
  const closeConversation = useChatStore((s) => s.closeConversation);
  const me = useAuthStore((s) => s.user);
  const toast = useToastStore((s) => s.show);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.get<Contact[]>("/contacts").then(setContacts).catch(() => {});
  }, []);

  if (!detail || !me) return null;

  const myMembership = detail.members.find((m) => m.user.id === me.id);
  const isAdmin = myMembership?.is_admin ?? false;
  const memberIds = new Set(detail.members.map((m) => m.user.id));
  const addable = contacts.filter((c) => !memberIds.has(c.user.id));

  async function addMember(userId: number) {
    if (!detail) return;
    setBusy(true);
    try {
      await api.post(`/groups/${detail.id}/members`, { user_id: userId });
      await refreshDetail(detail.id);
      setAddOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not add member", "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId: number) {
    if (!detail) return;
    setBusy(true);
    const leaving = userId === me?.id;
    try {
      await api.delete(`/groups/${detail.id}/members/${userId}`);
      if (leaving) {
        closeConversation();
        await refresh();
        onClose();
        toast("You left the group");
      } else {
        await refreshDetail(detail.id);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not remove member", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Group info" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-2">
          <Avatar name={detail.name} color={detail.avatar_color} size={72} />
          <h3 className="text-lg font-semibold">{detail.name}</h3>
          <p className="text-xs text-signal-muted dark:text-signal-mutedDark">
            {detail.members.length} members
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium text-signal-muted dark:text-signal-mutedDark">Members</p>
            {isAdmin && (
              <button
                onClick={() => setAddOpen((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-signal-blue"
              >
                <PlusIcon className="h-3.5 w-3.5" /> Add
              </button>
            )}
          </div>

          {addOpen && (
            <div className="mb-2 rounded-lg border border-signal-border dark:border-signal-borderDark p-2">
              {addable.length === 0 ? (
                <p className="py-2 text-center text-xs text-signal-muted dark:text-signal-mutedDark">
                  All your contacts are already in this group
                </p>
              ) : (
                addable.map((c) => (
                  <button
                    key={c.id}
                    disabled={busy}
                    onClick={() => void addMember(c.user.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
                  >
                    <Avatar name={c.user.display_name} color={c.user.avatar_color} size={30} />
                    <span className="truncate text-sm">{c.user.display_name}</span>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="max-h-56 overflow-y-auto scrollbar-thin">
            {detail.members.map((m) => (
              <div key={m.user.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                <Avatar name={m.user.display_name} color={m.user.avatar_color} size={36} online={m.user.online} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {m.user.id === me.id ? "You" : m.user.display_name}
                  </p>
                  <p className="truncate text-xs text-signal-muted dark:text-signal-mutedDark">
                    @{m.user.username}
                  </p>
                </div>
                {m.is_admin && (
                  <span className="rounded-full bg-signal-blue/10 px-2 py-0.5 text-[10px] font-semibold text-signal-blue">
                    Admin
                  </span>
                )}
                {isAdmin && m.user.id !== me.id && (
                  <button
                    disabled={busy}
                    onClick={() => void removeMember(m.user.id)}
                    className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          disabled={busy}
          onClick={() => void removeMember(me.id)}
          className="w-full rounded-full border border-red-500/40 py-2 text-sm font-medium text-red-500 hover:bg-red-500/5 disabled:opacity-50"
        >
          Leave group
        </button>
      </div>
    </Modal>
  );
}
