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
    allow_origins=["http://localhost:5173", "https://edra-flow-v2-0-2w31qsepf-akashsingh040s-projects.vercel.app" , "https://edra-flow-v2-0-r5yazoe17-akashsingh040s-projects.vercel.app","https://edra-flow-v2-0-git-main-akashsingh040s-projects.vercel.app"],
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


class ProcedureIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=100, description="Unique slug identifier")
    title: str = Field(..., min_length=3, max_length=200, description="Procedure title")
    steps: list[str] = Field(..., min_length=1, description="Ordered step-by-step instructions")
    tags: list[str] = Field(default=[], description="Search tags")
    department: str = Field(..., min_length=1, max_length=200, description="Responsible department")
    contact: str = Field(..., min_length=1, max_length=200, description="Contact email or phone")


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "edraflow-rag", "indexed": rag.index.ntotal if rag else 0}


# @app.post("/chat", response_model=ChatResponse)
# async def chat(body: ChatRequest):
#     if rag is None:
#         raise HTTPException(status_code=503, detail="RAG engine not ready")
#     try:
#         result = rag.chat(body.query)
#         return ChatResponse(**result)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(body: ChatRequest):
    try:
        print("QUERY:", body.query)

        result = rag.chat(body.query)

        print("RESULT:", result)
        print("TYPE:", type(result))

        return {
            "answer": str(result.get("answer", "")),
            "steps": result.get("steps"),
            "source": result.get("source"),
            "title": result.get("title"),
            "score": float(result["score"]) if result.get("score") is not None else None,
        }

    except Exception as e:
        import traceback
        print(traceback.format_exc())

        return {"error": str(e)}


@app.post("/reload")
async def reload():
    """Reload procedure data and rebuild the FAISS index."""
    if rag is None:
        raise HTTPException(status_code=503, detail="RAG engine not ready")
    rag.reload()
    return {"message": "Index reloaded", "count": rag.index.ntotal}


# ── Procedure CRUD ───────────────────────────────────────────────────────────
@app.get("/procedures")
async def list_procedures():
    """Return all procedures in the knowledge base."""
    if rag is None:
        raise HTTPException(status_code=503, detail="RAG engine not ready")
    return {"procedures": rag.get_procedures(), "total": len(rag.get_procedures())}


@app.post("/procedures", status_code=201)
async def create_procedure(body: ProcedureIn):
    """Add a new procedure to the knowledge base and rebuild the index."""
    if rag is None:
        raise HTTPException(status_code=503, detail="RAG engine not ready")
    try:
        proc = rag.add_procedure(body.model_dump())
        return {"message": "Procedure added", "procedure": proc}
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.delete("/procedures/{proc_id}")
async def remove_procedure(proc_id: str):
    """Delete a procedure by id and rebuild the index."""
    if rag is None:
        raise HTTPException(status_code=503, detail="RAG engine not ready")
    try:
        proc = rag.delete_procedure(proc_id)
        return {"message": "Procedure deleted", "procedure": proc}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
