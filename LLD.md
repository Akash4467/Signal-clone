# Low-Level Design (LLD)
## Secure Messaging Platform — Signal Clone

Companion to `HLD.md`. Covers schema, backend layering, WebSocket internals, and flow-level detail needed to implement and defend the system.

---

## 1. Backend Folder Structure

```
backend/
  app/
    api/            # FastAPI routers — HTTP-facing only
    models/         # SQLAlchemy ORM models
    schemas/        # Pydantic request/response schemas
    services/       # Business logic
    repositories/   # Database access only, no business logic
    websocket/       # ConnectionManager + WS route + event handlers
    auth/           # JWT issuing/validation, OTP mock
    db/             # Engine, session, base, seed script
    core/           # Config, settings, constants
    utils/          # Small shared helpers
    main.py         # App entrypoint, router registration, startup seed
```

### Layering Rule

```
API Layer  →  Service Layer  →  Repository Layer  →  Database
```

- **API layer**: validates request shape (via Pydantic schemas), calls a service method, returns the response. No SQL, no business rules.
- **Service layer**: business logic — e.g. "can this user message this conversation," "bump conversation timestamp," "fan out a WebSocket event." Calls one or more repositories.
- **Repository layer**: CRUD only — `create_message()`, `get_messages_for_conversation()`, `update_receipt_status()`. No validation, no business decisions.
- **Database layer**: SQLAlchemy models, engine/session management.

Example of what NOT to do: a route handler building a `SELECT ... JOIN ...` directly. That query belongs in a repository, invoked by a service.

---

## 2. Database Schema

### 2.1 User
```
User
  id                  PK
  username            unique
  phone               unique
  display_name
  avatar_color        # generated, e.g. hex — no file storage needed by default
  avatar_url           # nullable, used only if a real image is uploaded (bonus)
  is_verified         boolean, default false   # flipped by mocked OTP verification
  online              boolean, default false
  last_seen           datetime, nullable
  created_at          datetime
```
No `password_hash`. Auth is phone/username + mocked OTP → JWT (see §5).

### 2.2 Contact
```
Contact
  id                  PK
  user_id             FK → User.id
  contact_user_id     FK → User.id
  created_at          datetime

  unique(user_id, contact_user_id)
```
Unilateral by design — Signal-style. A adding B as a contact does not require B to reciprocate.

### 2.3 Conversation
```
Conversation
  id                  PK
  is_group            boolean
  name                nullable  # required if is_group=True, null for 1:1
  avatar_color        nullable
  created_at          datetime
  updated_at          datetime  # bumped by MessageService on every new message
```
No participant list lives here — see `ConversationMember`. This single table represents both DM and group threads, which is the core normalization decision of the schema (see HLD §4.8).

### 2.4 ConversationMember
```
ConversationMember
  id                  PK
  conversation_id     FK → Conversation.id
  user_id             FK → User.id
  is_admin            boolean, default false   # meaningful only when is_group=True
  joined_at           datetime

  unique(conversation_id, user_id)
```
Many-to-many join table. For a 1:1 conversation there are exactly 2 rows; for a group, N rows.

### 2.5 Message
```
Message
  id                  PK
  conversation_id     FK → Conversation.id
  sender_id           FK → User.id
  content             text
  content_type        enum: text | image, default text
  attachment_url      nullable                     # bonus: image attachments
  reply_to_id         FK → Message.id, nullable   # bonus: quoted replies
  created_at          datetime
```
Note: no single `status` column. Status is per-recipient (see §2.6) — required for correct group semantics.

### 2.6 MessageReceipt
```
MessageReceipt
  id                  PK
  message_id          FK → Message.id
  user_id             FK → User.id           # the recipient this receipt is for
  status               enum: sent | delivered | read
  updated_at          datetime

  unique(message_id, user_id)
```

**Why this table exists (design correction from initial draft):**
A single `status` field on `Message` works for 1:1 chat but breaks for groups — three different recipients read a message at three different times, so "read" cannot be one column on the message itself. `MessageReceipt` gives each recipient their own status row per message.

For a 1:1 conversation this collapses naturally to "the one other participant's receipt," so the UI logic (single/double check, blue check) doesn't get more complex for the common case — it's simply reading one row instead of one column.

### 2.7 Enum: MessageStatus
```
sent → delivered → read        (persisted, per-recipient)
sending                        (frontend-only optimistic state, never persisted)
```
Represented as a proper enum (not raw strings) at both the ORM and Pydantic layer. `sending` exists only as a client-side UI state before server ack — it never reaches the database, which is why the persisted enum starts at `sent`.

### 2.8 MessageReaction (bonus)
```
MessageReaction
  id                  PK
  message_id          FK → Message.id
  user_id             FK → User.id
  emoji               string
  created_at          datetime

  unique(message_id, user_id, emoji)
```

---

## 3. Entity Relationship Summary

```
User 1───* Contact *───1 User (self-referential via two FKs)
User 1───* ConversationMember *───1 Conversation
Conversation 1───* Message
Message 1───* MessageReceipt *───1 User
Message 1───* MessageReaction *───1 User
Message *───1 Message (self-referential, reply_to_id)
```

---

## 4. Status Transition Rules

| Status | Set when |
|---|---|
| `sending` | Optimistic client-side state only — never persisted, UI-only until server ack |
| `sent` | Message row successfully written to DB |
| `delivered` | Recipient's client acknowledges over an active WebSocket connection, **or** is set on next fetch if the recipient was offline at send time |
| `read` | Recipient opens that conversation in their UI → client calls `POST /messages/read` for that conversation → service writes/updates `MessageReceipt` rows → WebSocket broadcasts read event back to sender |

Delivery and read are always **service-layer writes followed by a WebSocket broadcast** — the WebSocket layer never mutates the database directly; it only triggers service calls and pushes the result.

---

## 5. Authentication Flow (Detail)

```
POST /auth/register       { phone, username, display_name }
                            → creates User row (unverified)

POST /auth/verify-otp      { phone, otp }
                            → OTP is a fixed mock value (e.g. "000000")
                            → on match: mark verified, issue JWT

POST /auth/login           { phone } → same OTP mock flow for returning users

JWT payload:                { user_id, exp }
Client storage:             localStorage (documented tradeoff: no httpOnly cookie,
                             acceptable given assignment scope; XSS exposure noted
                             as a known simplification, not a production pattern)

Authorization header:       Authorization: Bearer <jwt>
WebSocket auth:              wss://.../ws?token=<jwt>  (validated before upgrade,
                             since browsers cannot set custom headers on the WS
                             handshake)
```

---

## 6. WebSocket Manager (Detail)

### 6.1 Connection Registry

Corrected from a naive single-connection-per-user map, which breaks under multiple tabs/devices:

```python
active_connections: dict[int, set[WebSocket]] = {}
```

- `connect(user_id, ws)` → adds `ws` to `active_connections[user_id]`; sets `User.online = True` only on the **first** connection for that user.
- `disconnect(user_id, ws)` → removes `ws`; sets `User.online = False` and stamps `last_seen` only when the set becomes **empty** (i.e. the user's last tab/device disconnected).

This ensures presence reflects "has at least one active connection," not "has exactly one," which matters as soon as a user opens the app in two tabs.

### 6.2 Manager Responsibilities

| Method | Purpose |
|---|---|
| `connect(user_id, ws)` | Register connection, update presence |
| `disconnect(user_id, ws)` | Deregister, update presence if last connection |
| `send_to_user(user_id, event)` | Push an event to every active connection for one user |
| `broadcast_to_conversation(conversation_id, event, exclude_user_id=None)` | Fan out to all members of a conversation (looked up via `ConversationMember`) |
| `handle_typing(conversation_id, user_id)` | Broadcast ephemeral typing event; never touches DB |

### 6.3 Event Types (WS payload `type` field)

```
new_message
message_delivered
message_read
typing
presence_update
```

Each event carries only the data the client needs to patch its local state — no full re-fetch required.

---

## 7. Pagination

`GET /conversations/{id}/messages?before_id=<id>&limit=50`

Cursor-based on `id`/`created_at` rather than offset — cheap on SQLite and avoids skipping/duplicating rows if new messages arrive while scrolling. Default `limit=50`. Required given the "persist everything" requirement — without it, opening a long-lived conversation would load full history in one call.

---

## 7.1 Conversation Summary (unread count + preview)

`GET /conversations` returns a `ConversationSummary` per thread:
- `last_message` — latest `Message` in the conversation (content + sender + timestamp), used as the list preview
- `unread_count` — `count(MessageReceipt where user_id = me and status != read)` for that conversation
- Sorted by `Conversation.updated_at desc`

Both are computed in `ConversationRepository.list_for_user()` with aggregate queries — not N+1 per conversation.

---

## 8. Avatar Handling

Default: no file storage required. Each `User` gets a deterministic `avatar_color` (derived from user id) and the frontend renders initials-on-color, matching Signal's own fallback avatar style.

Bonus path (if attachments are implemented): `avatar_url` becomes populated via the same upload endpoint used for image attachments, keeping one upload pipeline instead of two.

---

## 9. Class/Module Sketch (Service Layer Examples)

```python
class MessageService:
    def send_message(self, sender_id, conversation_id, content, reply_to_id=None) -> Message:
        # 1. validate sender is a ConversationMember
        # 2. repository.create_message(...)
        # 3. repository.create_receipts(message, other_members, status=SENT)
        # 4. repository.touch_conversation(conversation_id)  # updated_at = now
        # 5. websocket_manager.broadcast_to_conversation(...)
        ...

    def mark_delivered(self, message_id, user_id) -> None: ...
    def mark_conversation_read(self, conversation_id, user_id) -> list[Message]: ...


class ConversationService:
    def create_group(self, creator_id, name, member_ids) -> Conversation: ...
    def get_or_create_direct(self, user_a_id, user_b_id) -> Conversation: ...
    def list_for_user(self, user_id) -> list[ConversationSummary]: ...
```

Repositories underneath expose only data access: `MessageRepository.create()`, `MessageRepository.get_page(conversation_id, before_id, limit)`, `ConversationRepository.touch(conversation_id)`, etc. — no branching business logic.

---

## 10. Seeding Strategy

`db/seed.py`, run once at startup if the DB is empty:
- N sample users with distinct avatar colors
- A few unilateral contact relationships
- 2–3 direct conversations with message history
- 1 group conversation with 3+ members and mixed read/delivered/unread messages

This guarantees the app is immediately explorable without manual signup, per the assignment's seeding requirement.

---

## 11. SOLID Mapping to Concrete Classes

| Principle | Concrete instance |
|---|---|
| SRP | `ConnectionManager` only manages sockets; `MessageService` only orchestrates message business rules |
| OCP | Adding an `image` message type extends `Message.content_type` and a new service method, without touching `send_message`'s core flow |
| LSP | `MessageRepository` could be swapped for an in-memory test double implementing the same interface |
| ISP | `MessageRepository` and `ConversationRepository` are separate — no single bloated `Repository` god-class |
| DIP | `MessageService` depends on a repository abstraction, not directly on SQLAlchemy session calls inline in the route |

---

## 12. Frontend Structure (Next.js, TypeScript)

```
frontend/
  src/
    app/              # Next.js App Router
      (auth)/         # register / verify / login screens
      chat/           # main layout: conversation list + chat pane
      settings/       # settings placeholders
    components/
      layout/         # Sidebar, ChatPane shell
      conversations/  # ConversationList, ConversationItem, SearchBar
      chat/           # MessageBubble, MessageList, Composer, TypingIndicator, ReceiptTicks
      modals/         # NewChat, NewGroup, GroupInfo, AddContact
      ui/             # Avatar, Badge, Toast — shared primitives
    lib/
      api.ts          # typed REST client (fetch wrapper, attaches JWT)
      ws.ts           # WebSocket client: connect, auto-reconnect, event dispatch
      types.ts        # shared TS types mirroring Pydantic schemas
    store/            # Zustand stores: auth, conversations, messages, presence
```

- **State management: Zustand** — lighter than Redux, no provider boilerplate; WS events patch stores directly.
- **Optimistic send:** message appears instantly with `sending` state; reconciled with server message on ack.
- **WS reconnect:** exponential backoff; on reconnect, refetch conversation list to catch missed events.

---

## 13. Mocked / Placeholder Surfaces (assignment-required)

| Surface | Treatment |
|---|---|
| Voice / video calls | Header icons → "Coming Soon" toast |
| Stories | Sidebar entry → placeholder screen |
| Linked devices | Settings entry → placeholder screen |
| E2E encryption | "Messages are end-to-end encrypted" banner in chat + mocked safety-number screen; no real crypto |
| Settings | Privacy / Notifications / Appearance placeholder pages (Appearance hosts dark-mode toggle if implemented) |

---

## 14. Known Simplifications (for interview transparency)

| Simplification | Why acceptable here |
|---|---|
| No Alembic migrations | Fixed, small schema; `create_all()` + seed is faster and sufficient |
| JWT in localStorage, not httpOnly cookie | Assignment scope; documented as a known production gap |
| Presence inaccurate on hard crash | No heartbeat/ping-timeout implemented; acceptable tradeoff at this scale |
| No message-body full-text search | Out of scope per HLD §4.9 |
| Single SQLite file, no replication | Required by assignment, not a production posture |
