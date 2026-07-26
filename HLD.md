# High-Level Design (HLD)
## Secure Messaging Platform — Signal Clone

---

## 1. Objective

Build a functional clone of Signal that replicates its core messaging workflows — auth, contacts, one-on-one chat, group chat, real-time delivery — with a clean, modular, and explainable architecture.

**Optimizing for:** simplicity, extensibility, clean architecture, and the ability to justify every decision.
**Not optimizing for:** massive scale, distributed systems, high concurrency.

---

## 2. Requirements

### 2.1 Functional — Must Have
- Authentication with session persistence
- Contacts management
- One-to-one chat
- Group chat
- Real-time messaging
- Search (conversations/contacts)
- Delivery receipts
- Read receipts
- Typing indicators
- Online status / last seen
- Signal-like UI
- Full persistence of all data

### 2.2 Functional — Nice to Have
- Image attachments
- Message reactions
- Reply / quoted messages
- Dark mode

### 2.3 Non-Functional — Important
- Fast, responsive UI
- Simple, predictable APIs
- Modular, readable code
- Easy local setup and deployment
- SQLite compatibility
- Easy debugging

### 2.4 Non-Functional — Explicitly Out of Scope
- Millions of concurrent users
- Horizontal scaling
- Distributed message brokers (Kafka, etc.)
- Redis / caching clusters
- Multi-region deployment

---

## 3. High-Level Architecture

```
                 Browser (Next.js)
                        │
              REST  +  WebSocket
                        │
                 FastAPI Backend
      ┌──────────────┬──────────────┬───────────────┐
      │              │              │               │
 Authentication   Chat Service  WebSocket Manager  Contact Service
      │              │              │               │
      └──────────────┴──────────────┴───────────────┘
                        │
                 SQLAlchemy ORM
                        │
                    SQLite DB
```

A single FastAPI monolith serves both REST endpoints and a WebSocket endpoint, backed by one SQLite database accessed exclusively through SQLAlchemy.

---

## 4. Key Architectural Decisions

### 4.1 Monolith vs Microservices
**Chosen: Monolith.**

| | Microservices (Auth / Chat / User / Notification / Gateway) | Monolith (this design) |
|---|---|---|
| Deployment | Complex, multiple services | Single deploy target |
| Debugging | Cross-service tracing needed | Straightforward, single process |
| Boilerplate | High (service discovery, gateways) | Minimal |
| Interview clarity | Harder to reason about live | Easy to walk through end-to-end |
| Independent scaling | Yes | No |

**Tradeoff accepted:** cannot scale services independently. Irrelevant at this scale — worth it.

### 4.2 Database: SQLite
Required by the assignment. Zero configuration, single file, portable, trivial to deploy alongside the backend.

**Tradeoff accepted:** cannot support high concurrent write volume. Not a concern for this use case.

### 4.3 ORM: SQLAlchemy
| Option | Pros | Cons |
|---|---|---|
| Raw SQL | Fast | Hard to maintain, error-prone |
| SQLModel | Cleaner syntax | Smaller ecosystem, less mature |
| **SQLAlchemy** | Industry standard, mature, flexible | Slightly more verbose |

No migration tool (Alembic) is used. Schema is created via `Base.metadata.create_all()` on startup, and a `seed.py` script populates sample data. This is a deliberate simplification appropriate for an assignment with a fixed, small schema — not a production migration strategy.

### 4.4 Real-Time Transport: WebSocket
| Option | Verdict |
|---|---|
| Polling (`GET /messages` every N seconds) | Simple but poor UX, wasted requests |
| Server-Sent Events | One-directional only (server → client); can't carry typing/read events back efficiently |
| **WebSocket** | Bidirectional, low-latency — correct fit for chat |

### 4.5 REST + WebSocket Split
**Rule: never put everything on WebSockets.**

| Concern | Transport |
|---|---|
| Login, registration | REST |
| Contacts CRUD | REST |
| Conversation & message history (paginated) | REST |
| Group create / member management | REST |
| New message delivery | WebSocket |
| Typing indicator | WebSocket (ephemeral, never persisted) |
| Presence (online/offline) | WebSocket |
| Read/delivery receipt notifications | WebSocket (state change is written via REST/service, then broadcast) |

### 4.6 Authentication: JWT
Chosen over server-side session cookies because it pairs naturally with a Next.js SPA/client and a stateless API.

```
Login → JWT issued → stored client-side → sent as Authorization: Bearer <token>
```

The WebSocket handshake does not support custom headers from browser clients, so the JWT is passed as a query parameter on connection: `wss://.../ws?token=<jwt>`. The server validates it before upgrading the connection.

Because OTP verification is mocked (fixed code), authentication is effectively **passwordless**: phone/username + OTP → JWT. No password hash is required, which removes an entire unnecessary flow to build and explain.

### 4.7 Contacts Model
Unilateral, Signal-style contacts (not mutual "friends"). A user can only start a conversation with someone they've added as a contact — this mirrors Signal's actual UX and avoids an open "message anyone" surface.

### 4.8 Conversations Unify 1:1 and Group Chat
Rather than modeling direct messages and group chats separately, both are represented as a `Conversation` with an `is_group` flag and a `ConversationMember` join table. This is the central design decision of the schema — see LLD for details. It means the entire messaging pipeline (send, receive, receipts, typing) is written once and works identically for both chat types.

### 4.9 Search Scope
Search is limited to conversation names and contact display names — not full message-body search. Keeps the feature simple and matches what's actually needed for a conversation-list UX.

### 4.10 Presence
`online` (boolean) and `last_seen` (timestamp) are updated on WebSocket connect/disconnect.

**Tradeoff accepted:** a hard browser crash (no clean disconnect event) can leave a user shown as "online" until the connection times out server-side. Acceptable for this scope; a heartbeat/ping-timeout mechanism could tighten this later.

### 4.11 Typing Indicators Are Ephemeral
Never written to the database. Broadcast over WebSocket only, and cleared client-side after a timeout. There is no historical value in "who was typing," so persisting it would be pure waste.

### 4.12 No Caching Layer
No Redis. Single SQLite instance, single backend process — a cache would add complexity with no measurable benefit at this scale.

### 4.13 Notifications
In-app browser toasts only. No push notification service (out of scope, correctly, per assignment).

---

## 5. API Surface (Resource-Oriented)

```
/auth          — register, verify OTP, login, logout
/users         — profile, avatar, presence
/contacts      — list, add, search
/conversations — list, create, history (paginated)
/messages      — send, mark delivered/read
/groups        — create, add/remove member, list members
/ws            — single WebSocket endpoint for all real-time events
```

---

## 6. End-to-End Flows

### 6.1 Send Message
```
Client → POST /messages → Service layer validates sender + membership
       → Repository persists message (status=sent)
       → Service updates Conversation.updated_at
       → WebSocket Manager pushes to online recipients
       → Recipient client marks delivered → POST /messages/{id}/delivered
       → WebSocket notifies original sender (status updates in UI)
```

### 6.2 Read Receipt
```
User opens conversation
  → REST call marks all unread messages as read for that user
  → Service writes per-user receipt rows
  → WebSocket broadcasts read event to sender(s)
```

### 6.3 Group Creation
```
POST /groups → Conversation(is_group=True) created
             → ConversationMember row per selected contact
             → No separate Group table — group *is* a Conversation
```

---

## 7. Design Principles Applied (SOLID)

| Principle | Application |
|---|---|
| Single Responsibility | Services, repositories, and the WebSocket manager each own exactly one concern |
| Open/Closed | New message types (image, file) extend the existing pipeline without modifying the text-message flow |
| Liskov Substitution | Repository implementations are interchangeable behind a common interface |
| Interface Segregation | Service/repository interfaces stay narrow and purpose-specific, not "god" interfaces |
| Dependency Inversion | Routes depend on service abstractions, never directly on ORM/database details |

---

## 8. Explicit Tradeoffs Summary

| Decision | Gained | Given Up |
|---|---|---|
| Monolith | Simplicity, easy debugging | Independent service scaling |
| SQLite | Zero-config, portable | High write concurrency |
| No Alembic | Faster setup | Formal migration history |
| Passwordless auth | Simpler flow | Password-based recovery (not needed given mocked OTP) |
| No message-body search | Simplicity | Full-text search |
| Presence via connect/disconnect only | Simplicity | Accuracy on hard crashes |
| Per-message-per-user read receipts | Correct group read-state | Slightly more complex schema than a single status column |

---

## 9. Deployment View

```
Single EC2 instance (Docker Compose)
  ├── nginx           → reverse proxy, TLS termination
  │     ├── /         → Next.js container
  │     └── /api, /ws → FastAPI container (WS upgrade headers proxied)
  ├── frontend        → Next.js (production build)
  ├── backend         → FastAPI (uvicorn)
  └── SQLite          → file on a mounted volume (survives container restarts)
```

Single-origin deployment behind nginx: no cross-origin CORS complexity in production, and nginx handles the WebSocket `Upgrade`/`Connection` headers for `/ws`. Locally, the same Compose file runs frontend and backend directly with CORS enabled for `localhost`.
