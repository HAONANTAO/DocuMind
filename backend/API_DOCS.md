# DocuMind Backend — API Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Environment Variables](#3-environment-variables)
4. [Authentication](#4-authentication)
5. [API Endpoints](#5-api-endpoints)
   - [Health Check](#51-health-check)
   - [Auth Routes](#52-auth-routes)
   - [Document Routes](#53-document-routes)
   - [Chat Routes](#54-chat-routes)
6. [Database Models](#6-database-models)
7. [RAG Pipeline](#7-rag-pipeline)

---

## 1. Project Overview

DocuMind is a document Q&A platform. Users upload PDF files, which are processed and stored as semantic vectors. They can then chat with the document — asking questions in natural language and receiving AI-generated answers grounded in the document content.

The backend is a Node.js/Express REST API with:
- JWT-based authentication
- Async PDF processing (parse → chunk → embed → store in Pinecone)
- A RAG (Retrieval-Augmented Generation) query pipeline
- Server-Sent Events (SSE) for streaming AI responses token by token

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB (via Mongoose 8) |
| Vector Store | Pinecone |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM | OpenAI `gpt-4o-mini` |
| LLM Orchestration | LangChain (`@langchain/openai`, `@langchain/pinecone`) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| File Upload | Multer (memory storage, PDF-only, 20 MB limit) |
| PDF Parsing | `pdf-parse` |
| Config | `dotenv` |
| Dev | Nodemon |

---

## 3. Environment Variables

Create a `.env` file in the backend root. All variables below are required.

```env
# Server
PORT=5000

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/documind

# JWT
JWT_SECRET=your_jwt_secret_here

# OpenAI
OPENAI_API_KEY=sk-...

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=documind
```

| Variable | Description |
|---|---|
| `PORT` | Port the Express server listens on |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key used to sign and verify JWTs |
| `OPENAI_API_KEY` | OpenAI API key (used for embeddings and chat) |
| `PINECONE_API_KEY` | Pinecone API key |
| `PINECONE_INDEX` | Name of the Pinecone index (e.g. `documind`) |

---

## 4. Authentication

Protected endpoints require a `Bearer` token in the `Authorization` header.

```
Authorization: Bearer <jwt_token>
```

Tokens are issued on `/api/auth/register` and `/api/auth/login`, and are valid for **7 days**.

The auth middleware (`src/middleware/auth.js`) verifies the token and attaches `req.userId` to the request for downstream handlers.

---

## 5. API Endpoints

### 5.1 Health Check

#### `GET /`

Confirms the API is running. No authentication required.

**Response**
```json
{ "message": "DocuMind API is running" }
```

---

### 5.2 Auth Routes

Base path: `/api/auth`

---

#### `POST /api/auth/register`

Create a new user account.

**Authentication:** Not required

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Must be unique. Stored lowercase. |
| `password` | string | Yes | Hashed with bcrypt (10 salt rounds) before storage. |

**Response — 201 Created**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "664a1f2e3c4b5d6e7f8a9b0c",
    "email": "user@example.com",
    "plan": "free"
  }
}
```

**Error Responses**

| Status | Condition |
|---|---|
| 400 | Email already registered |
| 500 | Server error |

**Example**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'
```

---

#### `POST /api/auth/login`

Log in with an existing account.

**Authentication:** Not required

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response — 200 OK**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "664a1f2e3c4b5d6e7f8a9b0c",
    "email": "user@example.com",
    "plan": "free"
  }
}
```

**Error Responses**

| Status | Condition |
|---|---|
| 400 | Email not found, or password does not match |
| 500 | Server error |

**Example**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'
```

---

#### `GET /api/auth/me`

Return the profile of the currently authenticated user.

**Authentication:** Required

**Response — 200 OK**
```json
{
  "_id": "664a1f2e3c4b5d6e7f8a9b0c",
  "email": "user@example.com",
  "plan": "free",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

`passwordHash` is excluded from the response.

**Example**
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

---

### 5.3 Document Routes

Base path: `/api/documents`

All routes require authentication.

---

#### `POST /api/documents/upload`

Upload a PDF and trigger async processing (parse → chunk → embed → store in Pinecone).

**Authentication:** Required

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | PDF only. Maximum size: 20 MB. |

**Response — 201 Created**

Returned immediately — processing continues in the background.

```json
{
  "message": "File uploaded, processing started",
  "document": {
    "_id": "664b2e3f4d5c6a7b8e9f0a1b",
    "userId": "664a1f2e3c4b5d6e7f8a9b0c",
    "fileName": "contract.pdf",
    "fileSize": 204800,
    "status": "uploading",
    "chunkCount": 0,
    "errorMessage": null,
    "createdAt": "2025-01-01T12:00:00.000Z",
    "updatedAt": "2025-01-01T12:00:00.000Z"
  }
}
```

**Status lifecycle:** `uploading` → `processing` → `ready` (or `error`)

Poll `GET /api/documents` to track status until it reaches `ready`.

**Error Responses**

| Status | Condition |
|---|---|
| 400 | No file provided, or file is not a PDF |
| 401 | Not authenticated |
| 500 | Server error |

**Example**
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/document.pdf"
```

---

#### `GET /api/documents`

List all documents uploaded by the authenticated user, sorted newest first.

**Authentication:** Required

**Response — 200 OK**
```json
[
  {
    "_id": "664b2e3f4d5c6a7b8e9f0a1b",
    "userId": "664a1f2e3c4b5d6e7f8a9b0c",
    "fileName": "contract.pdf",
    "fileSize": 204800,
    "status": "ready",
    "chunkCount": 42,
    "errorMessage": null,
    "createdAt": "2025-01-01T12:00:00.000Z",
    "updatedAt": "2025-01-01T12:01:30.000Z"
  }
]
```

**Example**
```bash
curl http://localhost:5000/api/documents \
  -H "Authorization: Bearer <token>"
```

---

#### `DELETE /api/documents/:id`

Delete a document record from MongoDB.

> **Note:** Pinecone vectors for this document are not currently deleted (marked as TODO in the source).

**Authentication:** Required

**URL Parameters**

| Param | Description |
|---|---|
| `id` | MongoDB ObjectId of the document |

**Response — 200 OK**
```json
{ "message": "Document deleted" }
```

**Error Responses**

| Status | Condition |
|---|---|
| 404 | Document not found, or belongs to another user |
| 500 | Server error |

**Example**
```bash
curl -X DELETE http://localhost:5000/api/documents/664b2e3f4d5c6a7b8e9f0a1b \
  -H "Authorization: Bearer <token>"
```

---

### 5.4 Chat Routes

Base path: `/api/chat`

All routes require authentication.

---

#### `POST /api/chat`

Ask a question about a document. Streams the AI answer token by token using **Server-Sent Events (SSE)**.

**Authentication:** Required

**Request Body**
```json
{
  "documentId": "664b2e3f4d5c6a7b8e9f0a1b",
  "question": "What are the payment terms in this contract?"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `documentId` | string | Yes | Must be a `ready` document owned by the user. |
| `question` | string | Yes | The natural-language question to ask. |

**Response — SSE Stream**

Headers:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

The response is a stream of SSE events. Each event is a JSON object on a `data:` line.

**Token event** (one per AI token):
```
data: {"token":"Payment"}

data: {"token":" terms"}

data: {"token":" are"}
```

**Done event** (sent once, after the full answer is generated):
```
data: {"done":true,"sources":[{"content":"...chunk text...","metadata":{"documentId":"...","userId":"...","chunkIndex":2}}]}
```

After this event the connection closes. The frontend should concatenate all `token` values to reconstruct the full answer, and use `sources` for citation display.

The last 6 messages of the conversation are included as context for multi-turn dialogue.

**Error Responses** (non-streaming, returned before headers are set)

| Status | Condition |
|---|---|
| 400 | `documentId` or `question` missing |
| 404 | Document not found, not owned by this user, or status is not `ready` |
| 500 | Server error |

**Example**
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"documentId":"664b2e3f4d5c6a7b8e9f0a1b","question":"What are the payment terms?"}'
```

---

#### `GET /api/chat/:documentId/history`

Retrieve the full conversation history for a specific document.

**Authentication:** Required

**URL Parameters**

| Param | Description |
|---|---|
| `documentId` | MongoDB ObjectId of the document |

**Response — 200 OK**

Returns an empty messages array if no conversation exists yet.

```json
{
  "messages": [
    {
      "role": "user",
      "content": "What are the payment terms?",
      "sources": [],
      "createdAt": "2025-01-01T12:05:00.000Z",
      "_id": "..."
    },
    {
      "role": "assistant",
      "content": "Payment is due within 30 days of invoice...",
      "sources": [
        {
          "content": "...relevant chunk from the document...",
          "metadata": {
            "documentId": "664b2e3f4d5c6a7b8e9f0a1b",
            "userId": "664a1f2e3c4b5d6e7f8a9b0c",
            "chunkIndex": 7
          }
        }
      ],
      "createdAt": "2025-01-01T12:05:02.000Z",
      "_id": "..."
    }
  ]
}
```

**Example**
```bash
curl http://localhost:5000/api/chat/664b2e3f4d5c6a7b8e9f0a1b/history \
  -H "Authorization: Bearer <token>"
```

---

## 6. Database Models

### User

Collection: `users`

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `email` | String | Unique, required, stored lowercase |
| `passwordHash` | String | bcrypt hash of the password (never returned in responses) |
| `plan` | String | `"free"` or `"pro"` — defaults to `"free"` |
| `createdAt` | Date | Auto-managed by Mongoose timestamps |
| `updatedAt` | Date | Auto-managed by Mongoose timestamps |

---

### Document

Collection: `documents`

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `userId` | ObjectId (ref: User) | The uploading user |
| `fileName` | String | Original filename as uploaded |
| `fileSize` | Number | File size in bytes |
| `status` | String | `"uploading"` → `"processing"` → `"ready"` or `"error"` |
| `chunkCount` | Number | Number of text chunks created during processing |
| `errorMessage` | String | Set if processing fails; otherwise `null` |
| `createdAt` | Date | Auto-managed |
| `updatedAt` | Date | Auto-managed |

The actual document content is **not stored in MongoDB**. Only metadata is stored here. The vectorized content lives in Pinecone, keyed by `documentId` and namespaced by `userId`.

---

### Conversation

Collection: `conversations`

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `userId` | ObjectId (ref: User) | The user who owns this conversation |
| `documentId` | ObjectId (ref: Document) | The document being discussed |
| `messages` | Array | Ordered list of messages |
| `createdAt` | Date | Auto-managed |
| `updatedAt` | Date | Auto-managed |

Each entry in `messages`:

| Field | Type | Description |
|---|---|---|
| `role` | String | `"user"` or `"assistant"` |
| `content` | String | The message text |
| `sources` | Array | Source chunks cited by the assistant (empty for user messages) |
| `createdAt` | Date | Defaults to `Date.now` |

Each source in `sources`:

| Field | Type | Description |
|---|---|---|
| `content` | String | The raw text of the retrieved chunk |
| `metadata` | Mixed | Includes `documentId`, `userId`, `chunkIndex` |

One conversation exists per `(userId, documentId)` pair. It is created lazily on the first chat message and reused for all subsequent messages on that document.

---

## 7. RAG Pipeline

RAG stands for **Retrieval-Augmented Generation**. Instead of relying on the LLM's training data, the AI answers are grounded entirely in the uploaded document's content.

### Indexing Phase (on Upload)

Triggered by `POST /api/documents/upload`, runs asynchronously after the HTTP response is sent.

```
PDF Buffer
    │
    ▼
[1. Parse]  pdf-parse extracts raw text from the PDF binary
    │
    ▼
[2. Split]  RecursiveCharacterTextSplitter breaks text into chunks
            chunkSize: 1000 characters
            chunkOverlap: 200 characters (prevents sentences being cut at boundaries)
    │
    ▼
[3. Embed]  OpenAI text-embedding-3-small converts each chunk into a
            1536-dimensional vector. Similar text → similar vectors.
    │
    ▼
[4. Store]  Vectors + metadata are upserted into Pinecone
            namespace: user_<userId>   (isolates per-user data)
            metadata:  { documentId, userId, chunkIndex }
```

Each chunk's metadata allows filtering by document at query time, so the AI only sees chunks from the selected document.

---

### Query Phase (on Chat)

Triggered by `POST /api/chat`.

```
User Question
    │
    ▼
[1. Retrieve]  Question is embedded with the same model.
               Top-5 most similar chunks are fetched from Pinecone
               (filtered by documentId + namespaced by userId).
    │
    ▼
[2. Build Prompt]
               SystemMessage: instructs the LLM to answer only from the
                              provided context, never from outside knowledge.
               ChatHistory:   last 6 messages for multi-turn dialogue.
               HumanMessage:  user question + retrieved chunks as context.
    │
    ▼
[3. Generate]  gpt-4o-mini streams the answer token by token.
               temperature=0 for deterministic, factual responses.
    │
    ▼
[4. Stream]    Each token is sent to the client via SSE as it arrives.
               After generation completes, source chunks are sent as citations.
    │
    ▼
[5. Persist]   User question + full AI answer + sources are appended
               to the Conversation document in MongoDB.
```

### Key Design Decisions

- **Memory storage for uploads:** PDFs are held in memory (never written to disk) and discarded after processing, keeping the server stateless.
- **Async processing:** The upload endpoint responds immediately (201) and processes in the background, so users are not blocked waiting for large documents.
- **User namespacing in Pinecone:** Each user's vectors live under `user_<userId>`, preventing any cross-user data leakage at the vector store level.
- **Document filtering:** Metadata filtering on `documentId` means queries are always scoped to a single document even though all of a user's documents share the same Pinecone namespace.
- **Context window management:** Only the last 6 conversation messages are passed to the LLM to keep token costs bounded while still supporting multi-turn dialogue.
