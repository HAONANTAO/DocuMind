# DocuMind PRD
## Product Requirements Document v1.0

**Author:** HAONANTAO
**Date:** 2026-04-09
**Status:** In Progress

---

## 1. Product Overview

### 1.1 Background

Large Language Models (LLMs) have a training data cutoff and cannot access users' private documents. Employees who need to search internal documents often spend significant time manually scanning through files. DocuMind uses RAG (Retrieval-Augmented Generation) to let users ask natural-language questions and get precise answers grounded in their own documents.

### 1.2 Product Positioning

> "Upload your document. Ask it anything."

DocuMind is a private document Q&A SaaS powered by RAG. Users register, upload PDFs, and ask questions through a conversational interface. The AI answers based solely on the document content and cites the exact source chunks used.

### 1.3 Target Users

| User Type | Typical Use Case |
|-----------|-----------------|
| New employees | Quickly search employee handbooks and internal policies |
| Legal / Compliance | Fast clause lookup in contracts and regulatory documents |
| Students / Researchers | Q&A and summarisation over papers and reports |

### 1.4 Core Value Propositions

- **Accurate** — AI answers only from the uploaded document, no hallucination
- **Transparent** — Every answer includes the exact source chunks used to generate it
- **Simple** — No learning curve; works like a chat interface
- **Secure** — Each user's data is strictly isolated; no cross-user access

---

## 2. Business Model (SaaS)

### 2.1 Pricing Tiers

| Plan | Price | Document Limit | Monthly Questions |
|------|-------|---------------|-------------------|
| Free | $0 / mo | 3 | 50 |
| Pro | $19 / mo | Unlimited | Unlimited |
| Enterprise | Contact sales | Unlimited + self-hosted | Unlimited |

> The pricing page is currently a static display. Payment integration is planned for a future release.

### 2.2 Conversion Strategy

- Free tier serves as the acquisition funnel
- Key conversion trigger: user hits document or question limit → prompt to upgrade Pro
- Stripe integration planned for future iteration

> **Status: Roadmap** — Pricing page is implemented as a static display only. Usage enforcement and Stripe payment are not yet implemented.

---

## 3. Feature Requirements

### 3.1 Priority Definitions

| Priority | Description |
|----------|-------------|
| P0 | Core features — must ship in MVP |
| P1 | Important features — target for v1 |
| P2 | Nice-to-have — implement if capacity allows |

---

### 3.2 User Authentication (P0) ✅

- User registration (email + password)
- Login / logout
- JWT auth on all protected endpoints
- Passwords hashed with bcrypt

---

### 3.3 Document Management (P0) ✅

- Upload PDF files, max 20 MB per file
- Automatically trigger processing pipeline on upload: chunk → embed → store in vector DB
- Document library page showing all uploaded files (name, upload time, status)
- Delete document and remove all associated vectors from Pinecone

**Document status lifecycle:**

| Status | Description |
|--------|-------------|
| uploading | File upload in progress |
| processing | Parsing and vectorising |
| ready | Processing complete, ready to query |
| error | Processing failed |

---

### 3.4 Document Q&A (P0) ✅

- Ask questions about any uploaded document
- Multi-turn conversation with context history (last 6 messages)
- AI answers include source chunk citations
- Conversation history persisted in MongoDB — survives page refresh
- Streaming responses via SSE — typewriter effect in the UI

**Prompt strategy:**

```
You are a professional document Q&A assistant.
Answer questions ONLY based on the provided document content.
Do NOT use any knowledge outside of the provided content.
If the answer cannot be found in the document, say so clearly.

[Document Chunks]
{retrieved_chunks}

[Question]
{user_question}
```

---

### 3.5 Pricing Page (P1) ✅

- Static display of Free / Pro / Enterprise tiers
- Feature comparison per tier
- Pro upgrade button shows "Coming soon" in MVP

---

### 3.6 Usage Limit Enforcement (P1)

> **Status: Roadmap** — not yet implemented

- Disable upload button with upgrade prompt when Free user reaches 3 documents
- Disable input with upgrade modal when Free user reaches 50 questions per month

---

### 3.7 Bonus Features (P2)

> **Status: Roadmap** — not yet implemented

- Export conversation as PDF
- Real-time processing progress bar
- Answer quality feedback (👍 / 👎)

---

## 4. Non-functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | First token response ≤ 5s under normal load |
| Security | Users can only access their own documents; strict data isolation |
| Availability | ≥ 99% uptime after launch |
| Compatibility | Latest versions of Chrome, Edge, and Safari |
| Mobile | Responsive design — usable on phones (native experience not required) |

---

## 5. Technical Architecture

### 5.1 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + Tailwind CSS | Matches existing MERN skillset |
| Backend | Node.js + Express | Matches existing MERN skillset |
| Primary DB | MongoDB | Stores users, documents, conversations |
| Vector DB | Pinecone | Free tier sufficient; clean API |
| AI Framework | LangChain.js | Abstracts RAG pipeline; fast to develop |
| AI Model | OpenAI GPT-4o-mini | Best cost-to-performance for development |
| Frontend Deploy | Vercel | Free tier, automatic CI/CD |
| Backend Deploy | Render | Free tier, supports Node.js |

---

### 5.2 RAG Core Pipeline

```
[User uploads PDF]
      │
      ▼
[PDF Parsing]
Extract plain text, split into 1,000-char chunks with 200-char overlap
      │
      ▼
[Embedding]
Call OpenAI text-embedding-3-small
Convert each chunk into a 1,536-dimensional vector
      │
      ▼
[Vector Storage]
Store in Pinecone
namespace: user_{userId}
metadata: documentId, chunkIndex
      │
      ▼
[User asks a question]
      │
      ▼
[Semantic Retrieval]
Embed the question
Retrieve top-5 most similar chunks from Pinecone
(filtered by userId namespace + documentId)
      │
      ▼
[Prompt Assembly]
retrieved chunks + chat history + user question → prompt
      │
      ▼
[LLM Generation]
Call GPT-4o-mini, stream response token by token via SSE
      │
      ▼
[Return answer + source citations]
Persist to MongoDB conversation history
```

---

### 5.3 Database Design

**users**
```json
{
  "_id": "ObjectId",
  "email": "string",
  "passwordHash": "string",
  "plan": "free | pro",
  "createdAt": "Date"
}
```

**documents**
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "fileName": "string",
  "fileSize": "number",
  "status": "uploading | processing | ready | error",
  "chunkCount": "number",
  "errorMessage": "string",
  "createdAt": "Date"
}
```

> Pinecone namespace is automatically derived as `user_{userId}` — no need to store it separately.

**conversations**
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "documentId": "ObjectId",
  "messages": [
    {
      "role": "user | assistant",
      "content": "string",
      "sources": [
        {
          "content": "string",
          "metadata": {
            "documentId": "string",
            "chunkIndex": "number"
          }
        }
      ],
      "createdAt": "Date"
    }
  ],
  "updatedAt": "Date"
}
```

---

### 5.4 API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/auth/register | Register a new user | ❌ |
| POST | /api/auth/login | Login and receive JWT | ❌ |
| GET | /api/auth/me | Get current user profile | ✅ |
| POST | /api/documents/upload | Upload and process a PDF | ✅ |
| GET | /api/documents | List all documents for user | ✅ |
| DELETE | /api/documents/:id | Delete document and vectors | ✅ |
| POST | /api/chat | Ask a question (SSE streaming) | ✅ |
| GET | /api/chat/:documentId/history | Get conversation history | ✅ |

---

## 6. UI Design

### 6.1 Pages

| Page | Route | Description |
|------|-------|-------------|
| Login / Register | /login | Authentication entry point |
| Document Library | /documents | Manage uploaded documents |
| Chat | /chat/:documentId | Core Q&A interface |
| Pricing | /pricing | SaaS plan display |

---

### 6.2 Chat Page Layout (Wireframe)

```
┌────────────────────────────────────────────────────┐
│  DocuMind                         [Email] [Logout]  │  ← Navbar
├─────────────────┬──────────────────────────────────┤
│                 │                                  │
│  My Documents   │  ┌─────────────────────────┐    │
│  ───────────    │  │ What are the penalty     │    │  ← User bubble
│  📄 Handbook    │  │ clauses in this contract?│    │
│  📄 Q3 Report◀ │  └─────────────────────────┘    │
│  📄 Contract A  │                                  │
│                 │  Based on the document,          │
│  ───────────    │  the defaulting party must       │  ← AI answer
│  [+ Upload]     │  pay 20% of the contract value.. │
│                 │                                  │
│                 │  📎 Source 1 · chunk 12          │  ← Source citation
│                 │  "The defaulting party shall...  │
│                 │                                  │
│                 ├──────────────────────────────────┤
│                 │  [Ask a question...]    [Send]   │  ← Input
└─────────────────┴──────────────────────────────────┘
```

---

## 7. Delivery Plan (4 Weeks)

### Week 1 — Validate the AI Pipeline

- Register for OpenAI and Pinecone, obtain API keys
- Set up Node.js project structure
- Implement PDF parse → chunk → embed → store in Pinecone
- Implement question → vector search → build prompt → return answer
- **Goal: full RAG pipeline working in the terminal, no UI needed**

### Week 2 — Backend API

- User registration / login (JWT + bcrypt)
- Document upload endpoint (Multer + async processing)
- Chat endpoint (wire up Week 1 RAG pipeline)
- MongoDB conversation history
- **Goal: all endpoints testable via Postman**

### Week 3 — Frontend

- Login / register page
- Document library page
- Chat page (with SSE streaming typewriter effect)
- Pricing page
- **Goal: full local end-to-end working**

### Week 4 — Deploy & Polish

- Deploy frontend to Vercel, backend to Render
- Write README (architecture diagrams, local setup guide)
- Record a 2-minute product demo video
- Prepare interview talking points
- **Goal: live at a public URL, ready to add to résumé**

---

## 8. Interview Talking Points

> "I independently designed and built DocuMind — a private document Q&A SaaS powered by RAG.
>
> The core problem it solves: LLMs are trained on public data and cannot access your private documents. DocuMind bridges that gap using Retrieval-Augmented Generation.
>
> On the technical side, I implemented the full RAG pipeline from scratch: PDF parsing and chunking, OpenAI embedding vectorisation, Pinecone semantic search, GPT-4o-mini streaming generation, and source chunk citations so users can verify every answer.
>
> On the product side, I designed it as a SaaS with free and paid tiers, full JWT authentication, and strict per-user data isolation in both MongoDB and Pinecone namespaces.
>
> The project is live and I can demo it in real time."
