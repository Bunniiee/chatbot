# Architecture Notes

## Overview

This is a full-stack LLM observability platform. It allows users to chat with multiple LLM providers while automatically capturing inference metadata (latency, token counts, TTFB) through a built-in SDK layer. All data is persisted and surfaced on a metrics dashboard.

---

## System Components

### Backend — FastAPI (Python)
- Handles all API routes: conversations, messages, ingest, metrics
- Async throughout using `asyncio` and `asyncpg`
- Runs database migrations via Alembic on startup

### Frontend — React + TypeScript
- Single-page application built with Vite
- Communicates with the backend over HTTP and SSE (Server-Sent Events) for streaming
- Recharts for the metrics dashboard visualizations

### Database — PostgreSQL
- Two primary tables: `conversations`, `messages`
- One observability table: `inference_logs`
- Schema managed by Alembic migrations

---

## Data Flow

```
User types message
      │
      ▼
React frontend (ChatWindow)
      │  POST /api/conversations/{id}/messages
      ▼
FastAPI — chat.py router
      │  Fetches full message history
      │  Saves user message to DB
      ▼
LLMWrapper (SDK layer)
      │  Records start time
      │  Calls provider (Anthropic / OpenAI / Mock)
      │  Measures TTFB on first token
      ▼
Provider streams tokens via SSE
      │
      ▼
LLMWrapper intercepts usage chunk
      │  Calculates total latency
      │  Builds log payload
      │  Ships log async (fire-and-forget) to /api/ingest/log
      ▼
Frontend renders streamed tokens in real time
      │
      ▼
Ingest endpoint saves InferenceLog to DB
```

---

## Observability SDK

The SDK lives in `backend/app/sdk/` and has two parts:

- **`wrapper.py` — LLMWrapper**: Wraps every LLM call. Records `request_ts`, measures `latency_ms` and `stream_ttfb_ms` (time to first byte), intercepts usage chunks from the stream to capture token counts, then ships a structured log payload.

- **`transport.py` — ship_log**: A fire-and-forget async HTTP POST to the ingest endpoint. All exceptions are swallowed so a logging failure never impacts the user-facing response.

This design keeps the SDK non-blocking — the user receives their response without waiting for the log to be persisted.

---

## Database Schema

### `conversations`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| title | String | Auto-generated (Chat 1, Chat 2…) |
| provider | String | anthropic / openai / mock |
| model | String | e.g. claude-sonnet-4-5 |
| status | String | active |
| created_at | Timestamp | |

### `messages`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| conversation_id | UUID | Foreign key → conversations |
| role | String | user / assistant |
| content | Text | |
| created_at | Timestamp | |

### `inference_logs`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key (maps to event_id from SDK) |
| conversation_id | UUID | Foreign key → conversations |
| provider | String | |
| model | String | |
| request_ts | Timestamp | When the request was initiated |
| latency_ms | Numeric | Total request duration |
| stream_ttfb_ms | Numeric | Time to first token (streaming only) |
| prompt_tokens | Integer | |
| completion_tokens | Integer | |
| total_tokens | Integer | |
| status | String | success / error |
| error_message | String | Populated on failure |
| input_preview | String | First 200 chars of prompt |
| output_preview | String | First 200 chars of response |
| ingested_at | Timestamp | When the log was stored |

---

## Key Design Decisions

**Streaming via SSE**
The backend uses `StreamingResponse` with `text/event-stream`. The frontend reads the stream with the `ReadableStream` API directly (not `EventSource`) so it can attach an `AbortController` for mid-stream cancellation.

**Fire-and-forget logging**
The SDK ships logs asynchronously after the response completes. This ensures zero added latency to the user-facing request. A 2-second timeout is applied; failures are silently dropped.

**Provider abstraction**
All providers implement a `BaseProvider` interface with a single `complete()` method. Adding a new provider requires only implementing that interface and registering it in the `providers` dict.

**Conversation history**
The full message history is fetched before each LLM call and passed as the `messages` array. This gives the model context of the entire conversation, not just the latest message.

---

## Project Structure

```
chatbot/
├── backend/
│   ├── app/
│   │   ├── routers/        # chat.py, metrics.py, ingest.py
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # llm_service.py, log_service.py
│   │   ├── sdk/            # wrapper.py, transport.py
│   │   ├── config.py       # Settings via pydantic-settings
│   │   ├── database.py     # Async engine and session
│   │   └── main.py         # App entrypoint, router registration
│   └── alembic/            # Database migrations
├── frontend/
│   └── src/
│       ├── components/     # ChatWindow, Sidebar
│       ├── pages/          # Dashboard
│       └── lib/            # api.ts (axios client)
└── docker-compose.yml
```
