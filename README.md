# Edraflow

A production-ready student platform with PDF sharing, admin approval, and an AI chatbot (EdraChat) powered by RAG.

## Architecture

```
edraflow/
├── client/   → React + Vite + Tailwind frontend
├── server/   → Node.js + Express + MongoDB backend
└── rag/      → FastAPI + LangChain + FAISS RAG service
```

## Quick Start

### 1. Backend (Node.js)

```bash
cd server
cp .env.example .env   # fill in your values
npm install --legacy-peer-deps
npm run dev            # runs on http://localhost:5000
```

### 2. Frontend (React)

```bash
cd client
cp .env.example .env   # adjust VITE_API_URL / VITE_RAG_URL if needed
npm install
npm run dev            # runs on http://localhost:5173
```

### 3. RAG Service (Python)

```bash
cd rag
cp .env.example .env   # add your GROQ_API_KEY
python -m venv .venv
.venv\Scripts\activate    # Windows
source .venv/bin/activate # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload  # runs on http://localhost:8000
```

## Environment Variables

### server/.env
| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Random secret for JWT signing |
| `CLOUDINARY_NAME` | Cloudinary cloud name |
| `CLOUDINARY_KEY` | Cloudinary API key |
| `CLOUDINARY_SECRET` | Cloudinary API secret |
| `CLIENT_URL` | Frontend URL (for CORS) |

### rag/.env
| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq API key (for chat completions) |
| `GROQ_CHAT_MODEL` | (Optional) Groq model name |
| `EMBED_MODEL` | (Optional) local embedding model name (FastEmbed) |

### client/.env
| Variable | Description |
|---|---|
| `VITE_API_URL` | Node API base (default `/api`). For production, if the SPA and API are on **different origins** and `/api` is not reverse-proxied on the same host, set this to the full API base (e.g. `https://api.example.com/api`) so in-app PDF viewing and downloads work. |
| `VITE_RAG_URL` | RAG service URL |

## API Reference

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new student |
| POST | `/api/auth/login` | Login, receive JWT |
| GET | `/api/auth/me` | Get current user (auth required) |

### PDFs
| Method | Route | Description |
|---|---|---|
| POST | `/api/pdf/upload` | Upload PDF (auth required) |
| GET | `/api/pdf/public` | List approved PDFs |
| GET | `/api/pdf/public/:id` | Metadata for one approved PDF (no direct file URL) |
| GET | `/api/pdf/public/:id/stream` | Stream PDF (`Content-Disposition: inline`). Add `?download=1` for attachment download |
| GET | `/api/pdf/my` | My uploads (auth required) |
| GET | `/api/pdf/pending` | Pending PDFs (admin) |
| GET | `/api/pdf/all` | All PDFs (admin) |
| PUT | `/api/pdf/approve/:id` | Approve PDF (admin) |
| PUT | `/api/pdf/reject/:id` | Reject PDF (admin) |
| DELETE | `/api/pdf/:id` | Delete PDF (owner or admin) |

### RAG
| Method | Route | Description |
|---|---|---|
| POST | `/chat` | Chat query |
| GET | `/health` | Service health |
| POST | `/reload` | Reload FAISS index |

## Creating an Admin User

After starting the server, register a user normally then update their role in MongoDB:

```js
// In MongoDB shell / Compass
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```

## Deployment

| Service | Platform |
|---|---|
| Frontend | Vercel |
| Node.js API | Render (Web Service) |
| RAG API | Render (Web Service, Python) |
| Database | MongoDB Atlas |
| Storage | Cloudinary |

### PDF delivery (Cloudinary)

In the Cloudinary console, under **Settings → Security**, allow **delivery of PDF and ZIP files** if public PDF URLs return errors. The API streams approved PDFs from Cloudinary and sets `Content-Disposition` to **inline** (read in browser) or **attachment** (download), so students do not rely on raw CDN headers alone.
