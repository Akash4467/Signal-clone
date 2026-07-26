import { create } from "zustand";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/ws";
import type { Conversation, ConversationSummary, Message, WsEvent } from "@/lib/types";
import { useAuthStore } from "./auth";
import { useToastStore } from "./toast";

interface ChatState {
  conversations: ConversationSummary[];
  activeId: number | null;
  activeDetail: Conversation | null;
  messages: Record<number, Message[]>;
  hasMore: Record<number, boolean>;
  typing: Record<number, Record<number, number>>;
  initialized: boolean;

  init: () => void;
  refresh: () => Promise<void>;
  openConversation: (id: number) => Promise<void>;
  closeConversation: () => void;
  loadOlder: () => Promise<void>;
  sendMessage: (content: string, replyToId?: number) => Promise<void>;
  toggleReaction: (messageId: number, emoji: string) => Promise<void>;
  refreshDetail: (id: number) => Promise<void>;
  handleEvent: (event: WsEvent) => void;
  pruneTyping: () => void;
}

function upsertMessage(list: Message[], message: Message): Message[] {
  const byId = list.findIndex((m) => m.id === message.id);
  if (byId >= 0) {
    const next = [...list];
    next[byId] = { ...message, client_key: list[byId].client_key };
    return next;
  }
  return [...list, message];
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  activeDetail: null,
  messages: {},
  hasMore: {},
  typing: {},
  initialized: false,

  init: () => {
    if (get().initialized) return;
    set({ initialized: true });
    wsClient.subscribe((event) => get().handleEvent(event));
    wsClient.connect(() => void get().refresh());
    void get().refresh();
  },

  refresh: async () => {
    const conversations = await api.get<ConversationSummary[]>("/conversations");
    set({ conversations });
  },

  openConversation: async (id) => {
    set({ activeId: id, activeDetail: null });
    const [detail, messages] = await Promise.all([
      api.get<Conversation>(`/conversations/${id}`),
      api.get<Message[]>(`/conversations/${id}/messages?limit=50`),
    ]);
    if (get().activeId !== id) return;
    set((s) => ({
      activeDetail: detail,
      messages: { ...s.messages, [id]: messages },
      hasMore: { ...s.hasMore, [id]: messages.length === 50 },
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)),
    }));
    await api.post(`/conversations/${id}/read`);
  },

  closeConversation: () => set({ activeId: null, activeDetail: null }),

  loadOlder: async () => {
    const { activeId, messages, hasMore } = get();
    if (activeId === null || !hasMore[activeId]) return;
    const current = messages[activeId] ?? [];
    const oldest = current.find((m) => m.id > 0);
    if (!oldest) return;
    const older = await api.get<Message[]>(
      `/conversations/${activeId}/messages?before_id=${oldest.id}&limit=50`
    );
    set((s) => ({
      messages: { ...s.messages, [activeId]: [...older, ...(s.messages[activeId] ?? [])] },
      hasMore: { ...s.hasMore, [activeId]: older.length === 50 },
    }));
  },

  sendMessage: async (content, replyToId) => {
    const { activeId, activeDetail } = get();
    const me = useAuthStore.getState().user;
    if (activeId === null || !me) return;

    const clientKey = `tmp-${Date.now()}-${Math.random()}`;
    const optimistic: Message = {
      id: -Date.now(),
      conversation_id: activeId,
      sender: me,
      content,
      content_type: "text",
      attachment_url: null,
      reply_to: null,
      reactions: [],
      status: "sending",
      created_at: new Date().toISOString(),
      client_key: clientKey,
    };
    set((s) => ({
      messages: { ...s.messages, [activeId]: [...(s.messages[activeId] ?? []), optimistic] },
    }));

    try {
      const saved = await api.post<Message>("/messages", {
        conversation_id: activeId,
        content,
        reply_to_id: replyToId ?? null,
      });
      set((s) => ({
        messages: {
          ...s.messages,
          [activeId]: (s.messages[activeId] ?? []).map((m) =>
            m.client_key === clientKey ? { ...saved, client_key: clientKey } : m
          ),
        },
        conversations: bumpConversation(s.conversations, saved, activeDetail),
      }));
    } catch (err) {
      set((s) => ({
        messages: {
          ...s.messages,
          [activeId]: (s.messages[activeId] ?? []).filter((m) => m.client_key !== clientKey),
        },
      }));
      useToastStore.getState().show(err instanceof Error ? err.message : "Failed to send", "error");
    }
  },

  toggleReaction: async (messageId, emoji) => {
    try {
      await api.post<Message>(`/messages/${messageId}/reactions`, { emoji });
    } catch (err) {
      useToastStore.getState().show(err instanceof Error ? err.message : "Failed to react", "error");
    }
  },

  refreshDetail: async (id) => {
    if (get().activeId !== id) return;
    const detail = await api.get<Conversation>(`/conversations/${id}`);
    if (get().activeId === id) set({ activeDetail: detail });
  },

  handleEvent: (event) => {
    const state = get();
    switch (event.type) {
      case "new_message": {
        const msg = event.message;
        const convId = msg.conversation_id;
        const isActive = state.activeId === convId;
        set((s) => ({
          messages: s.messages[convId]
            ? { ...s.messages, [convId]: upsertMessage(s.messages[convId], { ...msg, status: null }) }
            : s.messages,
          typing: clearTypingFor(s.typing, convId, msg.sender.id),
        }));
        if (isActive) {
          void api.post(`/conversations/${convId}/read`);
        } else {
          void api.post(`/messages/${msg.id}/delivered`);
        }
        void state.refresh();
        break;
      }
      case "message_delivered": {
        set((s) => ({
          messages: patchStatus(s.messages, event.conversation_id, [event.message_id], event.status),
        }));
        break;
      }
      case "message_read": {
        set((s) => ({
          messages: patchStatus(s.messages, event.conversation_id, event.message_ids, "read"),
        }));
        break;
      }
      case "message_updated": {
        const msg = event.message;
        set((s) => ({
          messages: s.messages[msg.conversation_id]
            ? {
                ...s.messages,
                [msg.conversation_id]: (s.messages[msg.conversation_id] ?? []).map((m) =>
                  m.id === msg.id ? { ...msg, status: m.status, client_key: m.client_key } : m
                ),
              }
            : s.messages,
        }));
        break;
      }
      case "typing": {
        set((s) => ({
          typing: {
            ...s.typing,
            [event.conversation_id]: {
              ...(s.typing[event.conversation_id] ?? {}),
              [event.user_id]: Date.now() + 4000,
            },
          },
        }));
        break;
      }
      case "presence_update": {
        const user = event.user;
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.other_user?.id === user.id ? { ...c, other_user: user } : c
          ),
          activeDetail:
            s.activeDetail && s.activeDetail.members.some((m) => m.user.id === user.id)
              ? {
                  ...s.activeDetail,
                  other_user: s.activeDetail.other_user?.id === user.id ? user : s.activeDetail.other_user,
                  members: s.activeDetail.members.map((m) =>
                    m.user.id === user.id ? { ...m, user } : m
                  ),
                }
              : s.activeDetail,
        }));
        break;
      }
      case "conversation_created": {
        void state.refresh();
        break;
      }
      case "members_changed": {
        void state.refresh();
        void state.refreshDetail(event.conversation_id);
        break;
      }
      case "removed_from_conversation": {
        if (state.activeId === event.conversation_id) state.closeConversation();
        void state.refresh();
        useToastStore.getState().show("You were removed from a group", "info");
        break;
      }
    }
  },

  pruneTyping: () => {
    const now = Date.now();
    set((s) => {
      const next: ChatState["typing"] = {};
      for (const [convId, users] of Object.entries(s.typing)) {
        const alive = Object.fromEntries(Object.entries(users).filter(([, exp]) => exp > now));
        if (Object.keys(alive).length > 0) next[Number(convId)] = alive;
      }
      return { typing: next };
    });
  },
}));

function bumpConversation(
  conversations: ConversationSummary[],
  message: Message,
  detail: Conversation | null
): ConversationSummary[] {
  const idx = conversations.findIndex((c) => c.id === message.conversation_id);
  if (idx < 0) return conversations;
  const updated: ConversationSummary = {
    ...conversations[idx],
    last_message: message,
    updated_at: message.created_at,
  };
  const rest = conversations.filter((c) => c.id !== message.conversation_id);
  return [updated, ...rest];
}

function patchStatus(
  messages: Record<number, Message[]>,
  conversationId: number,
  messageIds: number[],
  status: Message["status"]
): Record<number, Message[]> {
  const list = messages[conversationId];
  if (!list) return messages;
  const ids = new Set(messageIds);
  return {
    ...messages,
    [conversationId]: list.map((m) => (ids.has(m.id) ? { ...m, status } : m)),
  };
}

function clearTypingFor(
  typing: ChatState["typing"],
  conversationId: number,
  userId: number
): ChatState["typing"] {
  const conv = typing[conversationId];
  if (!conv || !(userId in conv)) return typing;
  const { [userId]: _, ...rest } = conv;
  return { ...typing, [conversationId]: rest };
}
