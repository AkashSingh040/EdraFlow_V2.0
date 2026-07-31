"""
PdfChat FastAPI Service — port 8001
Endpoints:
  GET  /health
  POST /upload            — upload one or more PDFs, returns session_id
  POST /chat              — { session_id, query } → { answer, sources }
  DELETE /session/{id}   — cleanup session data

Security:
  - IP-based rate limiting via slowapi (/upload: 5/min, /chat: 15/min)
  - File size enforced at 20 MB per file before reading into memory
  - Max 5 PDF files per session to prevent memory bloat
  - Query validation: 2–1000 characters, stripped of leading/trailing whitespace
"""
import os
import uuid
import shutil
import tempfile
from typing import List

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from pdf_rag import PdfRAGEngine

# ── Constants ─────────────────────────────────────────────────────────────────
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024   # 20 MB per file
MAX_FILES_PER_SESSION = 5                 # max PDFs per session

# ── Rate Limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/day"])

# ── In-memory session store ───────────────────────────────────────────────────
# session_id (str) → PdfRAGEngine
_sessions: dict[str, PdfRAGEngine] = {}


def get_session(session_id: str) -> PdfRAGEngine:
    if session_id not in _sessions:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{session_id}' not found. Please upload a PDF first.",
        )
    return _sessions[session_id]


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="EdraFlow PDF Chat API",
    description="Upload PDFs and chat with them using LangChain + Groq + ChromaDB",
    version="1.0.0",
)

# ── Rate limiter wiring ───────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
    session_id: str = Field(..., min_length=1, max_length=36, description="Session UUID")
    query: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Question to ask about the uploaded PDFs",
    )

    @field_validator("query")
    @classmethod
    def strip_query(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 2:
            raise ValueError("Query must be at least 2 non-whitespace characters.")
        return stripped


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
@limiter.limit("60/minute")
async def health(request: Request):
    return {
        "status": "ok",
        "service": "edraflow-pdf-chat",
        "active_sessions": len(_sessions),
    }


@app.post("/upload", response_model=UploadResponse)
@limiter.limit("5/minute")
async def upload_pdfs(
    request: Request,
    files: List[UploadFile] = File(...),
    session_id: str = Form(default=""),
):
    """
    Accept one or more PDF files (max 20 MB each, max 5 per session).
    If session_id is provided (and valid), appends to that session.
    Otherwise creates a new session.
    Rate limited to 5 upload requests/minute per IP.
    """
    # ── Validate: at least 1 file ─────────────────────────────────────────────
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    # ── Get or create session ─────────────────────────────────────────────────
    if session_id and session_id in _sessions:
        engine = _sessions[session_id]
    else:
        session_id = str(uuid.uuid4())
        engine = PdfRAGEngine(session_id)
        _sessions[session_id] = engine

    # ── Check session file cap ────────────────────────────────────────────────
    existing_count = len(engine.uploaded_files) if hasattr(engine, "uploaded_files") else 0
    if existing_count + len(files) > MAX_FILES_PER_SESSION:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Session already has {existing_count} file(s). "
                f"Adding {len(files)} more would exceed the {MAX_FILES_PER_SESSION}-file limit per session."
            ),
        )

    total_chunks = 0
    processed_files = []
    tmp_dir = tempfile.mkdtemp()

    try:
        for upload in files:
            # ── Validate: PDF extension ───────────────────────────────────────
            if not upload.filename.lower().endswith(".pdf"):
                raise HTTPException(
                    status_code=400,
                    detail=f"'{upload.filename}' is not a PDF file. Only .pdf files are accepted.",
                )

            # ── Validate: file size (read in chunks to avoid memory spike) ────
            content = b""
            chunk_size = 256 * 1024  # 256 KB read chunks
            while True:
                chunk = await upload.read(chunk_size)
                if not chunk:
                    break
                content += chunk
                if len(content) > MAX_FILE_SIZE_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"'{upload.filename}' exceeds the 20 MB size limit. "
                            f"Please compress or split the PDF before uploading."
                        ),
                    )

            # ── Save to temp file and ingest ──────────────────────────────────
            tmp_path = os.path.join(tmp_dir, upload.filename)
            with open(tmp_path, "wb") as fp:
                fp.write(content)

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
@limiter.limit("15/minute")
async def chat(request: Request, body: ChatRequest):
    """
    Ask a question against the uploaded PDFs for a given session.
    Rate limited to 15 requests/minute per IP.
    """
    engine = get_session(body.session_id)

    try:
        result = engine.chat(body.query)
        return ChatResponse(answer=result["answer"], sources=result["sources"])
    except KeyError:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured on the server.",
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/session/{session_id}/files")
@limiter.limit("30/minute")
async def get_session_files(request: Request, session_id: str):
    """List files uploaded in a session."""
    engine = get_session(session_id)
    return {"session_id": session_id, "files": engine.uploaded_files}


@app.delete("/session/{session_id}")
@limiter.limit("10/minute")
async def delete_session(request: Request, session_id: str):
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
