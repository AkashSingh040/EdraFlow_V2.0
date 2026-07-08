# EdraFlow

> AI-powered university platform for verified study resources and institutional procedure guidance.

EdraFlow helps students access approved study materials (PDFs) and get step-by-step guidance on university procedures through **EdraChat**, an intelligent RAG-powered chatbot. Admins manage content approvals and can dynamically add or remove procedures from the chatbot's knowledge base — no redeployment required.

---

## Features

### For Students
- **EdraChat** — AI chatbot that answers questions about university procedures (scholarships, registration, transcript requests, etc.) with step-by-step guidance
- **PDF Library** — Browse and read admin-approved study resources directly in the browser
- **PDF Upload** — Submit PDFs for admin review and approval
- **In-Browser PDF Viewer** — Read documents without downloading, with a download option

### For Admins
- **Admin Dashboard** — Overview stats (total, pending, approved, rejected PDFs)
- **PDF Approvals** — Review, approve, or reject student-uploaded PDFs
- **Manage Procedures** — Add or delete EdraChat knowledge base entries through a UI (auto-rebuilds the FAISS vector index)

### Technical Highlights
- **RAG Pipeline** — Retrieval-Augmented Generation using FAISS vector search + Groq LLM for accurate, context-aware responses
- **Two-Layer Relevance Detection** — Cosine similarity threshold + LLM-based `[RELEVANT]`/`[OFF_TOPIC]` classification prevents irrelevant procedure responses
- **Live Index Rebuilds** — Adding/deleting procedures through the admin UI instantly updates the FAISS index — no restart needed
- **Role-Based Access Control** — JWT authentication with `student` and `admin` roles
- **Secure PDF Delivery** — Server-side streaming with `Content-Disposition` control (inline viewing or download)

---

## Architecture

EdraFlow uses a **microservices architecture** with three independently deployable services:

```
EdraFlow/
├── client/    → React + Vite + Tailwind CSS (SPA frontend)
├── server/    → Node.js + Express + MongoDB (API + auth + PDF management)
└── rag/       → FastAPI + FAISS + Groq (RAG chatbot service)
```

### Request Flow

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  Client   │──────▶│  Node Server │──────▶│  RAG Service │
│  (React)  │       │  (Express)   │       │  (FastAPI)   │
└──────────┘       └──────────────┘       └──────────────┘
     │                    │                      │
     │  /api/auth/*       │  MongoDB Atlas       │  FAISS Index
     │  /api/pdf/*        │  Cloudinary           │  procedures.json
     │  /api/procedures/* │  JWT Auth             │  Groq LLM
     │                    │                      │
     └────────────────────┘                      │
     │  /chat, /health    (direct)               │
     └───────────────────────────────────────────┘
```

- **Auth, PDFs, Procedures** → Client calls the Node server (JWT-protected)
- **Chat** → Client calls the RAG service directly (public endpoint)
- **Procedure CRUD** → Client → Node server (admin auth) → RAG service (proxy)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, Lucide Icons |
| Backend API | Node.js, Express 4, Mongoose, JWT, Multer |
| RAG Service | Python, FastAPI, FAISS (CPU), FastEmbed (BGE-small), Groq API |
| Database | MongoDB Atlas |
| File Storage | Cloudinary |
| LLM | Groq (Llama 3.1 8B Instant, configurable) |
| Deployment | Vercel (client), Render (server + RAG) |

---

## Quick Start

### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.10
- MongoDB Atlas cluster (or local MongoDB)
- Cloudinary account
- Groq API key ([console.groq.com](https://console.groq.com))

### 1. Clone the repository

```bash
git clone https://github.com/AkashSingh040/EdraFlow.git
cd EdraFlow
```

### 2. Node.js Server

```bash
cd server
cp .env.example .env   # fill in your values
npm install
npm run dev            # → http://localhost:5000
```

### 3. RAG Service (Python)

```bash
cd rag
cp .env.example .env   # add GROQ_API_KEY
python -m venv .venv

# Activate virtual environment:
.venv\Scripts\activate      # Windows (PowerShell)
source .venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
uvicorn main:app --reload   # → http://localhost:8000
```

> **Note:** On first run, FastEmbed will download the `BAAI/bge-small-en-v1.5` embedding model (~130 MB). Subsequent starts are instant.

### 4. React Client

```bash
cd client
cp .env.example .env   # adjust VITE_API_URL / VITE_RAG_URL if needed
npm install
npm run dev            # → http://localhost:5173
```

---

## Environment Variables

### `server/.env`

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `5000`) |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secret key for JWT token signing |
| `CLOUDINARY_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_SECRET` | Yes | Cloudinary API secret |
| `CLIENT_URL` | Yes | Frontend URL for CORS (e.g. `http://localhost:5173`) |
| `RAG_URL` | Yes | RAG service URL for procedure proxy (e.g. `http://localhost:8000`) |

### `rag/.env`

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for LLM chat completions |
| `GROQ_CHAT_MODEL` | No | Groq model name (default: `llama-3.1-8b-instant`) |
| `EMBED_MODEL` | No | FastEmbed model name (default: `BAAI/bge-small-en-v1.5`) |

### `client/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Node API base URL (default: `/api`). Set to full URL in production if API and client are on different origins. |
| `VITE_RAG_URL` | Yes | RAG service URL (e.g. `http://localhost:8000`) |

---

## API Reference

### Auth (`/api/auth`)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register a new student account |
| POST | `/api/auth/login` | — | Login, returns JWT token |
| GET | `/api/auth/me` | JWT | Get current user profile |

### PDFs (`/api/pdf`)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/pdf/upload` | JWT | Upload a PDF (goes to pending) |
| GET | `/api/pdf/public` | — | List all approved PDFs |
| GET | `/api/pdf/public/:id` | — | Get metadata for one approved PDF |
| GET | `/api/pdf/public/:id/stream` | — | Stream PDF inline. Add `?download=1` for attachment |
| GET | `/api/pdf/my` | JWT | List current user's uploads |
| GET | `/api/pdf/pending` | Admin | List pending PDFs for review |
| GET | `/api/pdf/all` | Admin | List all PDFs (any status) |
| PUT | `/api/pdf/approve/:id` | Admin | Approve a pending PDF |
| PUT | `/api/pdf/reject/:id` | Admin | Reject a pending PDF |
| DELETE | `/api/pdf/:id` | Owner/Admin | Delete a PDF |

### Procedures (`/api/procedures`)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/procedures` | Admin | List all procedures in the knowledge base |
| POST | `/api/procedures` | Admin | Add a new procedure (rebuilds FAISS index) |
| DELETE | `/api/procedures/:id` | Admin | Delete a procedure by ID (rebuilds FAISS index) |

### RAG Service (direct)

| Method | Route | Description |
|---|---|---|
| POST | `/chat` | Send a query, receive AI-generated answer with steps |
| GET | `/health` | Service health check + indexed vector count |
| POST | `/reload` | Force-reload procedures and rebuild FAISS index |

---

## Procedure Data Schema

Procedures are stored in `rag/data/procedures.json`. Each entry has:

```json
{
  "id": "scholarship-phd",
  "title": "Apply for PhD Scholarship",
  "steps": [
    "Visit the PhD section on the main campus (Building A, Floor 2)",
    "Check the scholarship noticeboard for available opportunities",
    "..."
  ],
  "tags": ["scholarship", "phd", "funding"],
  "department": "PhD Office",
  "contact": "phd-office@university.edu"
}
```

When a procedure is added or deleted via the admin UI, the `procedures.json` file is updated on disk and the FAISS index is rebuilt in-memory automatically.

---

## Project Structure

```
EdraFlow/
├── client/
│   └── src/
│       ├── api/              # Axios instances (Node API + RAG API)
│       ├── components/       # Navbar, PrivateRoute, AdminRoute
│       ├── context/          # AuthContext (JWT state management)
│       └── pages/
│           ├── Home.jsx          # Landing page
│           ├── Login.jsx         # Login form
│           ├── Register.jsx      # Registration form
│           ├── Chat.jsx          # EdraChat interface
│           ├── PublicPDFs.jsx    # PDF library (browse approved PDFs)
│           ├── PdfViewer.jsx     # In-browser PDF reader
│           ├── UploadPDF.jsx     # PDF upload form
│           └── admin/
│               ├── AdminDashboard.jsx    # Stats + pending approvals
│               └── ManageProcedures.jsx  # Procedure CRUD UI
│
├── server/
│   ├── server.js             # Express app entry point
│   └── src/
│       ├── controllers/
│       │   ├── authController.js       # Register, login, profile
│       │   ├── pdfController.js        # PDF CRUD + streaming
│       │   └── procedureController.js  # Proxy to RAG service
│       ├── middleware/
│       │   ├── auth.js            # JWT protect + adminOnly guards
│       │   ├── errorHandler.js    # Global error handler
│       │   └── upload.js          # Multer + Cloudinary config
│       ├── models/
│       │   ├── User.js            # User schema (name, email, role)
│       │   └── PDF.js             # PDF schema (title, status, url)
│       └── routes/
│           ├── authRoutes.js
│           ├── pdfRoutes.js
│           └── procedureRoutes.js
│
└── rag/
    ├── main.py               # FastAPI app with /chat, /procedures endpoints
    ├── rag_engine.py          # RAGEngine class (FAISS, embeddings, Groq LLM)
    ├── requirements.txt
    └── data/
        └── procedures.json   # Knowledge base (editable via admin UI)
```

---

## Creating an Admin User

After starting the server, register a user normally through the UI, then promote them in MongoDB:

```js
// MongoDB Shell or Compass
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

The admin can then access `/admin` to manage PDFs and procedures.

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploys from Git. Set `VITE_API_URL` and `VITE_RAG_URL` env vars. |
| Node.js API | Render (Web Service) | Set all `server/.env` variables in Render dashboard. |
| RAG Service | Render (Python Web Service) | Set `GROQ_API_KEY`. First deploy downloads the embedding model. |
| Database | MongoDB Atlas | Free tier (M0) works for development. |
| File Storage | Cloudinary | Free tier supports PDF uploads. |

### Cloudinary PDF Delivery

In the Cloudinary console → **Settings → Security**, enable **delivery of PDF and ZIP files** if public PDF URLs return errors. The API streams approved PDFs from Cloudinary and sets `Content-Disposition` to `inline` (read in browser) or `attachment` (download).

### PowerShell Execution Policy (Windows)

If you encounter script execution errors on Windows, run this before activating the venv:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

---

## How EdraChat Works

1. **Indexing** — On startup, the RAG service loads `procedures.json`, converts each procedure to a text representation, generates embeddings using `BAAI/bge-small-en-v1.5`, and builds a FAISS inner-product index.

2. **Retrieval** — When a student asks a question, the query is embedded and compared against all procedure vectors using cosine similarity. The top 3 matches are retrieved.

3. **Relevance Check** — A two-layer filter prevents irrelevant responses:
   - **Layer 1 (Score threshold):** If the best match score is below `0.35`, the query is rejected as off-topic without calling the LLM.
   - **Layer 2 (LLM classification):** The LLM is asked to tag its response as `[RELEVANT]` or `[OFF_TOPIC]`. Only `[RELEVANT]` responses include procedure steps and source information.

4. **Generation** — For relevant queries, the LLM (Groq Llama 3.1) generates a concise 2-4 sentence summary. The structured steps are displayed separately in the UI — not repeated in the answer text.

---

## License

This project is for educational and demonstration purposes.
