# chat_service - PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-15
**Stack:** Next.js 15 + React + TypeScript + Drizzle ORM + PostgreSQL + VLLM

## OVERVIEW

Chat application with AI assistant functionality. Uses VLLM as LLM backend, stores chat messages in local PostgreSQL via Docker, uses Drizzle ORM for DB operations.

## STRUCTURE

```
chat_service/
├── app/
│   ├── api/chat/route.ts    # POST (chat) + GET (load messages)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AIAssistantUI.jsx    # Main component, useChat hook, state management
│   ├── ChatPane.jsx         # Message display area
│   ├── Composer.jsx         # Input area
│   ├── Sidebar.jsx          # Conversations, folders list
│   ├── FolderRow.jsx        # Folder items
│   ├── ConversationRow.jsx # Chat items
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── db/
│   │   ├── schema.ts        # Drizzle schema (messages table)
│   │   └── index.ts         # DB connection
│   └── utils.ts
├── hooks/
└── drizzle.config.ts
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Chat API | `app/api/chat/route.ts` | POST saves to DB, GET loads from DB |
| Message state | `components/AIAssistantUI.jsx` | `loadedMessages` state for DB-loaded messages |
| Message display | `components/ChatPane.jsx` | Renders messages from `loadedMessages` |
| DB schema | `lib/db/schema.ts` | Messages table with conversationId, role, content |
| Rename feature | `components/ConversationRow.jsx` | `onRename` prop for folder rename |

## CONVENTIONS

- **State management**: React useState + localStorage for persistence
- **API**: Next.js App Router route handlers
- **DB**: Drizzle ORM with PostgreSQL (Docker)
- **AI SDK**: @ai-sdk/react useChat hook for streaming
- **UI**: shadcn/ui components + custom components

## KEY IMPLEMENTATIONS

### Message Persistence Flow

1. User sends message → `handleSubmit` adds to `loadedMessages` + calls `sendMessage`
2. AI response → `onFinish` in useChat adds to `loadedMessages` + saves to DB via API
3. Selecting conversation → `useEffect` fetches from GET `/api/chat?conversationId=X`
4. Messages displayed via `ChatPane` using `loadedMessages` state

### Important State Variables

- `loadedMessages`: Array of messages loaded from DB (reset on conversation change)
- `selectedId`: Current conversation ID
- `conversations`: Array of conversation metadata (title, folder, etc.)

## ANTI-PATTERNS (THIS PROJECT)

- Don't mix `useChat` messages with DB-loaded messages - use separate `loadedMessages` state
- Don't pass `selectedConversation?.messages` to ChatPane (caused rendering issues)
- Conversation IDs use client-generated format: `conv_[timestamp]_[random]`

## DATABASE

- **Type**: PostgreSQL via Docker
- **ORM**: Drizzle
- **Connection**: `postgres://chatuser:chatpass123@localhost:5432/chatdb`
- **Container**: `chat-postgres`
- **Table**: `messages` (id, conversationId, role, content, createdAt)

## COMMANDS

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
docker start chat-postgres  # Start PostgreSQL
```

## NOTES

- Messages save to DB both on user send (via POST body) and AI response (via onFinish callback)
- GET API returns messages ordered by createdAt
- Client uses client-side conversation IDs, not DB IDs
- Rename feature implemented via `onRename` prop passed through Sidebar → FolderRow → ConversationRow
