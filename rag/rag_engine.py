"""
RAG Engine — builds FAISS index from procedures.json and retrieves top matches.
Uses OpenAI embeddings for vectorisation and OpenAI Chat for response generation.
"""
import json
import os
import numpy as np
from pathlib import Path
from typing import Optional

from openai import OpenAI
import faiss

DATA_PATH = Path(__file__).parent / "data" / "procedures.json"
EMBED_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-3.5-turbo"
TOP_K = 3


class RAGEngine:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.procedures: list[dict] = []
        self.index: Optional[faiss.IndexFlatIP] = None
        self.embeddings: Optional[np.ndarray] = None
        self._build_index()

    # ── Index construction ────────────────────────────────────────────────────
    def _build_index(self):
        """Load procedures, embed them, and build FAISS inner-product index."""
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            self.procedures = json.load(f)

        # Create rich text representations for embedding
        texts = [self._procedure_to_text(p) for p in self.procedures]
        print(f"[RAG] Embedding {len(texts)} procedures…")

        raw = self.client.embeddings.create(input=texts, model=EMBED_MODEL)
        vectors = np.array([item.embedding for item in raw.data], dtype="float32")

        # Normalise for cosine similarity via inner product
        faiss.normalize_L2(vectors)
        self.embeddings = vectors

        dim = vectors.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        self.index.add(vectors)
        print(f"[RAG] FAISS index built — {self.index.ntotal} vectors, dim={dim}")

    def _procedure_to_text(self, proc: dict) -> str:
        """Convert a procedure dict to a searchable string."""
        steps_text = " ".join(proc.get("steps", []))
        tags_text = ", ".join(proc.get("tags", []))
        return f"{proc['title']}. {steps_text} Tags: {tags_text}"

    # ── Retrieval ─────────────────────────────────────────────────────────────
    def retrieve(self, query: str, top_k: int = TOP_K) -> list[dict]:
        """Return top_k most relevant procedures for the query."""
        raw = self.client.embeddings.create(input=[query], model=EMBED_MODEL)
        q_vec = np.array([raw.data[0].embedding], dtype="float32")
        faiss.normalize_L2(q_vec)

        scores, indices = self.index.search(q_vec, top_k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0:
                results.append({**self.procedures[idx], "score": float(score)})
        return results

    # ── Generation ────────────────────────────────────────────────────────────
    def chat(self, query: str) -> dict:
        """Retrieve relevant procedures and generate a helpful response."""
        matches = self.retrieve(query, top_k=TOP_K)

        if not matches:
            return {
                "answer": "I'm sorry, I couldn't find relevant information for your question.",
                "steps": None,
                "source": None,
                "title": None,
            }

        best = matches[0]
        context = "\n\n".join(
            f"Procedure: {m['title']}\nDepartment: {m.get('department', 'N/A')}\n"
            f"Steps:\n" + "\n".join(f"  {i+1}. {s}" for i, s in enumerate(m.get("steps", [])))
            for m in matches
        )

        system_prompt = (
            "You are EdraChat, a helpful university assistant. "
            "Answer students' questions about university procedures clearly and concisely. "
            "Use the provided procedure data to give accurate, step-by-step guidance. "
            "If the data doesn't cover the question, say so politely."
        )

        user_prompt = (
            f"Student question: {query}\n\n"
            f"Relevant university procedures:\n{context}\n\n"
            f"Please provide a clear, helpful answer. "
            f"If the answer involves steps, list them numbered."
        )

        completion = self.client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=600,
        )

        answer_text = completion.choices[0].message.content.strip()

        return {
            "answer": answer_text,
            "steps": best.get("steps"),
            "source": best.get("department"),
            "title": best.get("title"),
            "score": best.get("score"),
        }

    def reload(self):
        """Reload procedures and rebuild the FAISS index (admin utility)."""
        self._build_index()
