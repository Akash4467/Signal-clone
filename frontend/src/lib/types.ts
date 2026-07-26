export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface User {
  id: number;
  username: string;
  phone: string;
  display_name: string;
  avatar_color: string;
  avatar_url: string | null;
  about: string;
  online: boolean;
  last_seen: string | null;
}

export interface Contact {
  id: number;
  user: User;
  created_at: string;
}

export interface ReplyPreview {
  id: number;
  sender_name: string;
  content: string;
}

export interface Reaction {
  emoji: string;
  user_id: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: User;
  content: string;
  content_type: "text" | "image";
  attachment_url: string | null;
  reply_to: ReplyPreview | null;
  reactions: Reaction[];
  status: MessageStatus | null;
  created_at: string;
  client_key?: string;
}

export interface Member {
  user: User;
  is_admin: boolean;
  joined_at: string;
}

export interface ConversationSummary {
  id: number;
  is_group: boolean;
  name: string;
  avatar_color: string;
  other_user: User | null;
  last_message: Message | null;
  unread_count: number;
  updated_at: string;
}

export interface Conversation {
  id: number;
  is_group: boolean;
  name: string;
  avatar_color: string;
  other_user: User | null;
  members: Member[];
  created_at: string;
}

export type WsEvent =
  | { type: "new_message"; message: Message }
  | { type: "message_delivered"; message_id: number; conversation_id: number; status: MessageStatus }
  | { type: "message_read"; conversation_id: number; message_ids: number[]; reader_id: number }
  | { type: "message_updated"; message: Message }
  | { type: "typing"; conversation_id: number; user_id: number }
  | { type: "presence_update"; user: User }
  | { type: "conversation_created"; conversation: Conversation }
  | { type: "members_changed"; conversation_id: number }
  | { type: "removed_from_conversation"; conversation_id: number };
