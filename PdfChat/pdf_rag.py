"""
PdfChat RAG Engine
Handles PDF ingestion, chunking, embedding (HuggingFace), ChromaDB storage,
and LangChain + Groq LLM querying — all scoped per session_id.
"""
import os
import uuid
from pathlib import Path
from typing import List

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import Chroma
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings

# ── Constants ─────────────────────────────────────────────────────────────────
CHROMA_DIR = Path(__file__).parent / "chroma_store"
EMBED_MODEL = "all-MiniLM-L6-v2"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 150
TOP_K = 4

# ── Shared embedding model (loaded once) ──────────────────────────────────────
_embeddings: HuggingFaceEmbeddings | None = None


def get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        print(f"[PdfRAG] Loading embedding model: {EMBED_MODEL}")
        _embeddings = HuggingFaceEmbeddings(
            model_name=EMBED_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        print("[PdfRAG] Embedding model ready ✅")
    return _embeddings


# ── RAG prompt ────────────────────────────────────────────────────────────────
PROMPT_TEMPLATE = """You are a helpful assistant that answers questions based on the provided document context.
Use only the information from the context below. If the answer is not found in the context, say so honestly.

Context:
{context}

Question: {question}

Answer:"""


def _format_docs(docs) -> str:
    return "\n\n---\n\n".join(doc.page_content for doc in docs)


# ── Session-scoped RAG engine ─────────────────────────────────────────────────
class PdfRAGEngine:
    """
    One instance per session. Holds a Chroma collection for that session.
    """

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.collection_name = f"pdf_session_{session_id.replace('-', '_')}"
        self._vectorstore: Chroma | None = None
        self._file_names: List[str] = []
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)

    # ── Ingest ────────────────────────────────────────────────────────────────
    def ingest_pdf(self, file_path: str, file_name: str) -> int:
        """
        Load a PDF, chunk it, embed it, and add it to the session's Chroma collection.
        Returns the number of chunks added.
        """
        loader = PyPDFLoader(file_path)
        raw_docs = loader.load()

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        chunks = splitter.split_documents(raw_docs)

        # Tag each chunk with the source filename
        for chunk in chunks:
            chunk.metadata["source_file"] = file_name

        if self._vectorstore is None:
            self._vectorstore = Chroma(
                collection_name=self.collection_name,
                embedding_function=get_embeddings(),
                persist_directory=str(CHROMA_DIR),
            )

        self._vectorstore.add_documents(chunks)
        self._file_names.append(file_name)
        print(f"[PdfRAG] Ingested '{file_name}' → {len(chunks)} chunks (session={self.session_id})")
        return len(chunks)

    # ── Query ─────────────────────────────────────────────────────────────────
    def chat(self, query: str) -> dict:
        """
        Run a RAG query against the session's Chroma collection.
        Returns { answer, sources }.
        """
        if self._vectorstore is None:
            return {"answer": "No documents uploaded yet. Please upload a PDF first.", "sources": []}

        retriever = self._vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": TOP_K},
        )

        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            groq_api_key=os.environ["GROQ_API_KEY"],
        )

        prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)

        chain = (
            {"context": retriever | _format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )

        answer = chain.invoke(query)

        # Collect unique source references
        retrieved_docs = retriever.invoke(query)
        sources = list(
            {
                f"{doc.metadata.get('source_file', 'Unknown')} (p.{doc.metadata.get('page', '?') + 1})"
                for doc in retrieved_docs
            }
        )

        return {"answer": answer, "sources": sources}

    # ── Cleanup ───────────────────────────────────────────────────────────────
    def cleanup(self):
        """Delete the Chroma collection for this session."""
        if self._vectorstore is not None:
            try:
                self._vectorstore.delete_collection()
            except Exception as e:
                print(f"[PdfRAG] Cleanup error for session {self.session_id}: {e}")
        print(f"[PdfRAG] Session {self.session_id} cleaned up")

    @property
    def uploaded_files(self) -> List[str]:
        return list(self._file_names)
