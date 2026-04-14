# DocuMind

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![React](https://img.shields.io/badge/react-19-61dafb.svg)
[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://docu-mind-neon.vercel.app)

**AI-powered document Q&A SaaS built with Retrieval-Augmented Generation (RAG)**

Upload any PDF and instantly chat with it. DocuMind indexes your document into a vector database, then uses semantic search and a large language model to answer your questions — grounded in your actual content, with source citations.

**Live Demo:** [https://docu-mind-neon.vercel.app](https://docu-mind-neon.vercel.app)

---

## Features

- **Conversational Document Q&A** — Ask natural-language questions about any PDF and get accurate, context-aware answers
- **Streaming Responses** — Answers appear token-by-token via Server-Sent Events for a fast, typewriter-style UX
- **Source Citations** — Every answer includes the exact document chunks used to generate it
- **Multi-turn Memory** — Conversations maintain context across the last 6 exchanges
- **Async Document Processing** — Upload returns immediately; indexing runs in the background with real-time status updates
- **Secure Multi-tenancy** — Each user's documents and vectors are isolated by namespace in the vector database
- **JWT Authentication** — Stateless auth with 7-day token expiry and bcrypt password hashing

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, React Router v6, Tailwind CSS, Axios |
| **Backend** | Node.js, Express 5 |
| **Database** | MongoDB + Mongoose (users, documents, conversations) |
| **Vector Store** | Pinecone (1536-dimensional embeddings) |
| **AI / LLM** | OpenAI `gpt-4o-mini` (generation), `text-embedding-3-small` (embeddings) |
| **RAG Framework** | LangChain (document splitting, retrieval chain) |
| **PDF Parsing** | pdf-parse |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **File Uploads** | Multer (in-memory, 20 MB limit) |
| **Deployment** | Vercel (frontend), Render (backend) |

---

## Architecture

### RAG Pipeline — Indexing Phase (on PDF upload)

```
User uploads PDF
       │
       ▼
┌─────────────────┐
│   pdf-parse     │  Extract raw text from PDF
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  RecursiveCharacterTextSplitter │  Split into 1,000-char chunks
│  chunkSize: 1000                │  with 200-char overlap
│  chunkOverlap: 200              │
└────────┬────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  OpenAI Embeddings           │  text-embedding-3-small
│  1,536-dimensional vectors   │  one vector per chunk
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Pinecone Vector Database            │
│  namespace: user_<userId>            │  per-user isolation
│  metadata: documentId, chunkIndex    │
└──────────────────────────────────────┘
```

### RAG Pipeline — Query Phase (on chat message)

```
User sends question
       │
       ▼
┌──────────────────────────────┐
│  OpenAI Embeddings           │  Embed the question
│  text-embedding-3-small      │  into a 1,536-dim vector
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Pinecone Similarity Search          │
│  top-k: 5 chunks                     │  filtered by documentId
│  namespace: user_<userId>            │  + user namespace
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│  Prompt Assembly                                     │
│  system: "answer only from the document"             │
│  context: 5 retrieved chunks                         │
│  history: last 6 messages                            │
│  question: user's message                            │
└────────┬─────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  OpenAI gpt-4o-mini          │  Stream response token-by-token
│  via LangChain               │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Server-Sent Events (SSE)            │  Streams to frontend
│  + source chunk metadata             │  typewriter effect
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  MongoDB                     │  Persist messages + sources
│  Conversation collection     │
└──────────────────────────────┘
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Pinecone account + index named `documind` (dimensions: 1536, metric: cosine)
- OpenAI API key

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/DocuMind.git
cd DocuMind
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=3001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_at_least_32_chars
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=documind
OPENAI_API_KEY=your_openai_api_key
ALLOWED_ORIGIN=http://localhost:3000
```

Start the backend:

```bash
npm run dev     # development (nodemon)
npm start       # production
```

The API will be available at `http://localhost:3001`.

### 3. Frontend setup

```bash
cd frontend
npm install
```

Copy the example env file and fill in the local backend URL:

```bash
cp .env.example .env.local
```

`.env.local` is gitignored and will not be committed. Its contents:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

Start the frontend:

```bash
npm start
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

### Backend

| Variable | Description | Required |
|---|---|---|
| `PORT` | Port for the Express server | No (default: 3001) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for signing JWT tokens | Yes |
| `PINECONE_API_KEY` | Pinecone API key | Yes |
| `PINECONE_INDEX` | Pinecone index name (must be `documind`) | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `ALLOWED_ORIGIN` | Frontend origin allowed by CORS (e.g. `https://your-app.vercel.app`). If unset, all origins are allowed — **must be set in production** | No (dev only) |

### Frontend

| Variable | Description | Required |
|---|---|---|
| `REACT_APP_API_URL` | Backend API base URL (e.g. `https://your-backend.onrender.com/api`) | Yes (production) |
| `DISABLE_ESLINT_PLUGIN` | Disable ESLint during build | No |

---

## API Endpoints

Base URL: `https://<your-backend-domain>/api`

All protected routes require the header:
```
Authorization: Bearer <jwt_token>
```

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Create a new account |
| `POST` | `/auth/login` | No | Login and receive a JWT |
| `GET` | `/auth/me` | Yes | Get current user profile |

**Register / Login request body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Login response:**
```json
{
  "token": "<jwt>",
  "user": { "_id": "...", "email": "...", "plan": "free" }
}
```

---

### Documents

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/documents/upload` | Yes | Upload a PDF for processing |
| `GET` | `/documents` | Yes | List all documents for the user |
| `DELETE` | `/documents/:id` | Yes | Delete a document and its vectors |

**Upload** — multipart/form-data, field name `file`, max 20 MB.

**Document object:**
```json
{
  "_id": "...",
  "fileName": "report.pdf",
  "fileSize": 204800,
  "status": "ready",
  "chunkCount": 42,
  "createdAt": "2026-04-12T00:00:00.000Z"
}
```

Status lifecycle: `uploading` → `processing` → `ready` | `error`

---

### Chat

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/chat` | Yes | Ask a question (SSE streaming) |
| `GET` | `/chat/:documentId/history` | Yes | Retrieve conversation history |

**Chat request body:**
```json
{
  "documentId": "<document_id>",
  "question": "What are the key findings of this report?"
}
```

**Chat response** — `Content-Type: text/event-stream`

The stream sends raw text tokens as they are generated. On completion, a final JSON payload is sent:
```json
{
  "done": true,
  "sources": [
    {
      "content": "...relevant chunk text...",
      "metadata": { "documentId": "...", "chunkIndex": 3 }
    }
  ]
}
```

---

### Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | No | Server health check |

---

## How RAG Works in DocuMind

Traditional LLMs can only answer based on what they were trained on — they cannot read your private documents. **Retrieval-Augmented Generation (RAG)** solves this by giving the model access to your document at query time.

DocuMind implements RAG in two phases:

**1. Indexing (one-time, on upload)**

When you upload a PDF, the text is extracted and split into small, overlapping chunks (~1,000 characters each). Each chunk is converted into a numerical vector (an "embedding") that captures its semantic meaning. These vectors are stored in Pinecone, a purpose-built vector database, tagged with your user ID and document ID.

**2. Retrieval + Generation (every question)**

When you ask a question, that question is also converted into a vector using the same embedding model. Pinecone performs a similarity search to find the 5 document chunks whose meaning is closest to your question. Those chunks — along with your chat history — are injected into a prompt sent to GPT-4o-mini. The model is instructed to answer *only* from the provided context, which keeps it accurate and prevents hallucination.

The answer streams back to your browser word-by-word, and the source chunks are displayed so you can verify exactly where each answer came from.

---

## Project Structure

```
DocuMind/
├── backend/
│   └── src/
│       ├── index.js                  # Express server & middleware setup
│       ├── middleware/
│       │   └── auth.js               # JWT verification middleware
│       ├── models/
│       │   ├── User.js               # User schema
│       │   ├── Document.js           # Document metadata schema
│       │   └── Conversation.js       # Chat history schema
│       ├── routes/
│       │   ├── auth.js               # Auth routes
│       │   ├── documents.js          # Document upload/list/delete
│       │   └── chat.js               # Streaming chat + history
│       └── config/
│           ├── documentProcessor.js  # PDF parse → chunk → embed → store
│           ├── retriever.js          # Vector retrieval & prompt builder
│           └── rag.js                # LangChain RAG chain config
└── frontend/
    └── src/
        ├── App.js                    # Routes & protected route logic
        ├── context/
        │   └── AuthContext.js        # Global auth state
        ├── api/
        │   └── axios.js              # Axios instance with auth interceptor
        └── pages/
            ├── Login.jsx             # Register / login form
            ├── Documents.jsx         # Document library & upload
            ├── Chat.jsx              # Streaming chat interface
            └── Pricing.jsx           # Pricing tiers
```

---

## Screenshots

> Coming soon

---

## Roadmap

Planned features for future releases:

- [ ] **PDF viewer with highlighted source citations** — display the source page inline with the relevant passage highlighted, so users can verify answers without leaving the app
- [ ] **Stripe payment integration for Pro plan** — full billing flow for upgrading to Pro, managing subscriptions, and handling webhooks
- [ ] **Team workspaces** — shared document libraries with role-based access (owner, editor, viewer) for organisations
- [ ] **Support for more file types** — DOCX, TXT, Markdown, and web page URLs in addition to PDF
- [ ] **Mobile app** — React Native client with the same core Q&A experience optimised for smaller screens

---

## License

MIT
