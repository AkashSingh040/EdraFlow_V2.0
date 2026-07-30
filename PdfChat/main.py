"""
PdfChat FastAPI Service — port 8001
Endpoints:
  GET  /health
  POST /upload            — upload one or more PDFs, returns session_id
  POST /chat              — { session_id, query } → { answer, sources }
  DELETE /session/{id}   — cleanup session data
"""
import os
import uuid
import shutil
import tempfile
from typing import List

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pdf_rag import PdfRAGEngine

# ── In-memory session store ───────────────────────────────────────────────────
# session_id (str) → PdfRAGEngine
_sessions: dict[str, PdfRAGEngine] = {}


def get_session(session_id: str) -> PdfRAGEngine:
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found. Please upload a PDF first.")
    return _sessions[session_id]


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="EdraFlow PDF Chat API",
    description="Upload PDFs and chat with them using LangChain + Groq + ChromaDB",
    version="1.0.0",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: str
    query: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []


class UploadResponse(BaseModel):
    session_id: str
    files: List[str]
    chunks_added: int
    message: str


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "edraflow-pdf-chat",
        "active_sessions": len(_sessions),
    }


@app.post("/upload", response_model=UploadResponse)
async def upload_pdfs(
    files: List[UploadFile] = File(...),
    session_id: str = Form(default=""),
):
    """
    Accept one or more PDF files.
    If session_id is provided (and valid), appends to that session.
    Otherwise creates a new session.
    """
    # Validate file types
    for f in files:
        if not f.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"'{f.filename}' is not a PDF file.")

    # Get or create session
    if session_id and session_id in _sessions:
        engine = _sessions[session_id]
    else:
        session_id = str(uuid.uuid4())
        engine = PdfRAGEngine(session_id)
        _sessions[session_id] = engine

    total_chunks = 0
    processed_files = []
    tmp_dir = tempfile.mkdtemp()

    try:
        for upload in files:
            # Save to temp file
            tmp_path = os.path.join(tmp_dir, upload.filename)
            content = await upload.read()
            with open(tmp_path, "wb") as fp:
                fp.write(content)

            # Ingest
            chunks = engine.ingest_pdf(tmp_path, upload.filename)
            total_chunks += chunks
            processed_files.append(upload.filename)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    return UploadResponse(
        session_id=session_id,
        files=processed_files,
        chunks_added=total_chunks,
        message=f"Successfully processed {len(processed_files)} file(s) into {total_chunks} chunks.",
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    """Ask a question against the uploaded PDFs for a given session."""
    if not body.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    engine = get_session(body.session_id)

    try:
        result = engine.chat(body.query)
        return ChatResponse(answer=result["answer"], sources=result["sources"])
    except KeyError:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the server.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/session/{session_id}/files")
async def get_session_files(session_id: str):
    """List files uploaded in a session."""
    engine = get_session(session_id)
    return {"session_id": session_id, "files": engine.uploaded_files}


@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and its ChromaDB collection."""
    engine = get_session(session_id)
    engine.cleanup()
    del _sessions[session_id]
    return {"message": f"Session '{session_id}' deleted successfully."}


# ── Entrypoint ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PDF_CHAT_PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
