# Signal Clone

A full-stack real-time messaging application inspired by Signal, built using FastAPI, Next.js, WebSockets, and Docker. The project demonstrates scalable backend architecture, real-time communication, containerized deployment, and modern frontend development.

## 🟢 Live Demo

### Frontend

**Application:** http://18.234.140.123:3000


### Demo Credentials

> **OTP (Mock):** `000000`

| Phone | Username |
|--------|----------|
| +15550000001 | alice |
| +15550000002 | bob |
| +15550000003 | carol |
| +15550000004 | dave |
| +15550000005 | erin |

> Register with any of the above phone numbers and use the OTP `000000` to authenticate.
---

# Features

- JWT Authentication
- OTP-based Login (Mock)
- One-to-One Messaging
- Group Chats
- Real-time Messaging via WebSockets
- Read Receipts
- Typing Indicators
- Message Reactions
- Responsive UI
- Dockerized Deployment
- AWS EC2 Deployment

---

# Tech Stack

## Frontend

- Next.js 14
- React
- TypeScript
- Zustand
- TailwindCSS

## Backend

- FastAPI
- SQLAlchemy
- SQLite
- WebSockets
- JWT Authentication
- Pydantic

## Infrastructure

- Docker
- Docker Compose
- AWS EC2
- Nginx (Reverse Proxy)

---

# System Architecture

```mermaid
flowchart TB
    Internet(("Internet")) --> Nginx["Nginx Reverse Proxy<br/>(80 / 443 HTTPS)"]
    Nginx --> FE["Next.js Frontend<br/>(React + Zustand)"]
    Nginx --> BE["FastAPI Backend<br/>(REST + WebSockets)"]
    FE <--> BE
    BE --> DB[("SQLite Database")]

    style Internet fill:#1B1B1B,color:#fff,stroke:#3B76F0
    style Nginx fill:#2C6BED,color:#fff,stroke:#2C6BED
    style FE fill:#3B76F0,color:#fff,stroke:#3B76F0
    style BE fill:#26A69A,color:#fff,stroke:#26A69A
    style DB fill:#6E6E6E,color:#fff,stroke:#6E6E6E
```

---

# Frontend Architecture

```mermaid
flowchart TB
    App["App"]
    App --> Auth["Authentication<br/>(Welcome / OTP flow)"]
    App --> Sidebar["Sidebar"]
    Sidebar --> ConvList["Conversation List"]
    App --> ChatPane["ChatPane"]
    ChatPane --> MessageList["MessageList"]
    MessageList --> MessageBubble["MessageBubble"]
    ChatPane --> Composer["Composer"]
    ChatPane --> TypingIndicator["TypingIndicator"]
    App --> Store["Zustand Store"]
    Store --> AuthState["Auth State"]
    Store --> ChatState["Chat State"]
    Store --> WsState["WebSocket Client"]

    style App fill:#3B76F0,color:#fff
    style Store fill:#26A69A,color:#fff
    style ChatPane fill:#5C6BC0,color:#fff
    style Sidebar fill:#5C6BC0,color:#fff
```

---

# Backend Architecture

```mermaid
flowchart TB
    Client(["Client (REST / WebSocket)"]) --> API["API Layer<br/>Auth · Contacts · Conversations · Messages · Groups"]
    API --> Service["Service Layer<br/>Business logic & validation"]
    Service --> Repo["Repository Layer<br/>Database access only"]
    Service --> WS["WebSocket Manager<br/>Connection registry & broadcast"]
    Repo --> ORM["SQLAlchemy ORM"]
    ORM --> DB[("SQLite DB")]
    WS -.->|"push events"| Client

    style Client fill:#1B1B1B,color:#fff
    style API fill:#3B76F0,color:#fff
    style Service fill:#26A69A,color:#fff
    style Repo fill:#5C6BC0,color:#fff
    style WS fill:#EC407A,color:#fff
    style ORM fill:#6E6E6E,color:#fff
    style DB fill:#6E6E6E,color:#fff
```

---

# Class Design

```mermaid
classDiagram
    class User {
        +int id
        +string username
        +string phone
        +string display_name
        +bool online
        +datetime last_seen
    }
    class Conversation {
        +int id
        +bool is_group
        +string name
        +datetime updated_at
    }
    class ConversationMember {
        +int conversation_id
        +int user_id
        +bool is_admin
    }
    class Message {
        +int id
        +int conversation_id
        +int sender_id
        +string content
        +int reply_to_id
    }
    class MessageReceipt {
        +int message_id
        +int user_id
        +string status
    }
    class Contact {
        +int user_id
        +int contact_user_id
    }

    class AuthService
    class ConversationService
    class MessageService
    class ContactService
    class ConnectionManager

    class UserRepository
    class ConversationRepository
    class MessageRepository
    class ContactRepository

    User "1" --> "*" ConversationMember
    Conversation "1" --> "*" ConversationMember
    Conversation "1" --> "*" Message
    Message "1" --> "*" MessageReceipt
    User "1" --> "*" Contact

    MessageService --> MessageRepository
    MessageService --> ConnectionManager
    ConversationService --> ConversationRepository
    AuthService --> UserRepository
    ContactService --> ContactRepository
```

---

# Docker Architecture

```mermaid
flowchart TB
    subgraph Compose["Docker Compose"]
        FE["Frontend<br/>Next.js Container"]
        BE["Backend<br/>FastAPI Container"]
        Vol[("SQLite Volume")]
        FE <-->|"HTTP / WS"| BE
        BE --> Vol
    end

    style FE fill:#3B76F0,color:#fff
    style BE fill:#26A69A,color:#fff
    style Vol fill:#6E6E6E,color:#fff
```

---

# AWS Deployment

```mermaid
flowchart TB
    Internet(("Internet")) --> SG["AWS Security Group"]
    SG --> EC2["Amazon EC2 Instance"]
    EC2 --> Stack["Docker Compose Stack"]
    Stack --> FE["Next.js Container"]
    Stack --> BE["FastAPI Container"]
    FE <--> BE
    BE --> Vol[("SQLite Volume")]

    style Internet fill:#1B1B1B,color:#fff
    style SG fill:#FFA726,color:#fff
    style EC2 fill:#FF7043,color:#fff
    style FE fill:#3B76F0,color:#fff
    style BE fill:#26A69A,color:#fff
    style Vol fill:#6E6E6E,color:#fff
```

---

# API Documentation

Swagger

```
http://localhost:8000/docs
```

---

> **Note**
>
> This project was designed and implemented within a **24-hour development window**. The system architecture, technology stack, and implementation choices were selected to meet the project scope, timeline, and functional requirements within that constraint.
>
> For a production-scale deployment, the architecture and technology stack may evolve based on factors such as expected traffic, scalability, availability, security, maintainability, and business requirements. Components such as the database, caching layer, message broker, deployment strategy, and infrastructure would be selected according to the application's scale and operational needs.

---

# Running Locally

```bash
git clone https://github.com/Akash4467/Signal-clone.git

cd Signal-clone

docker compose up --build
```

---

# Deployment

The project is deployed using

- Docker Compose
- Amazon EC2
- Nginx Reverse Proxy

---

# Future Improvements

- End-to-End Encryption
- Media Sharing
- Voice Calling
- Video Calling
- Push Notifications
- PostgreSQL Support
- Kubernetes Deployment
