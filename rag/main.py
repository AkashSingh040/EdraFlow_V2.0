"""
Edraflow RAG Service — FastAPI application
Provides /chat endpoint powered by FAISS + OpenAI embeddings.
"""
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag_engine import RAGEngine

# ── App lifespan: load RAG engine once at startup ─────────────────────────
rag: RAGEngine | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag
    print("[startup] Initialising RAG engine…")
    rag = RAGEngine()
    print("[startup] RAG engine ready ✅")
    yield
    print("[shutdown] RAG engine stopped")


app = FastAPI(
    title="Edraflow RAG API",
    description="Retrieval-Augmented Generation service for EdraChat",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ──────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500, description="User's question")


class ChatResponse(BaseModel):
    answer: str
    steps: list[str] | None = None
    source: str | None = None
    title: str | None = None
    score: float | None = None


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "edraflow-rag", "indexed": rag.index.ntotal if rag else 0}


@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    if rag is None:
        raise HTTPException(status_code=503, detail="RAG engine not ready")
    try:
        result = rag.chat(body.query)
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reload")
async def reload():
    """Reload procedure data and rebuild the FAISS index."""
    if rag is None:
        raise HTTPException(status_code=503, detail="RAG engine not ready")
    rag.reload()
    return {"message": "Index reloaded", "count": rag.index.ntotal}
