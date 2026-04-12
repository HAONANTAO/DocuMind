# Contributing to DocuMind

Thank you for your interest in contributing! This guide covers everything you need to get the project running locally, the code conventions we follow, and the process for submitting changes.

---

## Development Environment Setup

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18 or higher |
| npm | 9 or higher |
| Git | any recent version |

You will also need accounts and API keys for:
- **MongoDB Atlas** — free tier is sufficient
- **Pinecone** — free tier, create an index named `documind` (dimensions: 1536, metric: cosine)
- **OpenAI** — any plan with access to `gpt-4o-mini` and `text-embedding-3-small`

### 1. Clone the repository

```bash
git clone https://github.com/HAONANTAO/DocuMind.git
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
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=any_random_string_at_least_32_chars
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=documind
OPENAI_API_KEY=your_openai_api_key
```

Start the backend in development mode (auto-restarts on file changes):

```bash
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local` (not committed to git):

```env
REACT_APP_API_URL=http://localhost:3001/api
```

Start the frontend:

```bash
npm start
```

The app will be available at `http://localhost:3000`. Both servers must run simultaneously.

---

## Code Style Guidelines

### General

- **Language**: JavaScript (ES2020+), no TypeScript currently
- **Formatting**: 2-space indentation, single quotes, no trailing semicolons (follow the existing style in each file)
- **Naming**: `camelCase` for variables and functions, `PascalCase` for React components and Mongoose models

### Backend

- All route handlers use `async/await` — no raw Promise chains
- Every route must have a `try/catch` that returns a JSON error response
- Add JSDoc comments to all exported functions and all route handlers
- Keep business logic in `config/` files, not inside route handlers
- Never log sensitive values (tokens, passwords, API keys)

### Frontend

- One component per file; filename matches the component name
- Use functional components and hooks only — no class components
- All API calls go through `src/api/axios.js`, except SSE streaming which uses `fetch` directly (axios does not support streaming)
- Tailwind CSS only — no inline `style` props, no CSS modules
- Keep pages in `src/pages/`, reusable components in `src/components/` (create the folder if needed)

### Commit messages

Follow the conventional commits format:

```
type: short description

Examples:
feat: add document search endpoint
fix: decode Chinese filenames from latin1 to utf8
docs: add JSDoc to ragQuery function
refactor: extract SSE streaming into a helper
```

---

## Submitting a Pull Request

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** — keep each PR focused on a single concern. A bug fix and a refactor should be separate PRs.

3. **Test locally** — verify both the happy path and edge cases in the browser before opening a PR.

4. **Push** your branch and open a Pull Request against `main`.

5. **PR description** should include:
   - What problem this solves or what feature it adds
   - How to test the change
   - Screenshots or screen recordings for UI changes

6. **Review**: a maintainer will review within a few days. Address any requested changes with new commits (do not force-push to a PR branch under review).

---

## Project Structure Reference

```
DocuMind/
├── backend/src/
│   ├── config/          # RAG pipeline (documentProcessor, retriever, rag)
│   ├── middleware/       # JWT auth middleware
│   ├── models/           # Mongoose schemas (User, Document, Conversation)
│   └── routes/           # Express route handlers (auth, documents, chat)
└── frontend/src/
    ├── api/              # Axios instance
    ├── context/          # AuthContext (global auth state)
    └── pages/            # One file per page/route
```

---

## Questions

Open a GitHub Issue or start a Discussion — all questions are welcome.
