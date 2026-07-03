/**
 * Procedure Controller
 * Proxies procedure CRUD requests to the RAG service.
 * All routes require admin authentication.
 */

const RAG_URL = (process.env.RAG_URL || "http://localhost:8000").replace(/\/$/, "");

// ── GET /api/procedures ─────────────────────────────────────────────────────
const getProcedures = async (req, res) => {
  const response = await fetch(`${RAG_URL}/procedures`);
  const data = await response.json();

  if (!response.ok) {
    return res.status(response.status).json(data);
  }
  res.json(data);
};

// ── POST /api/procedures ────────────────────────────────────────────────────
const createProcedure = async (req, res) => {
  const response = await fetch(`${RAG_URL}/procedures`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();

  if (!response.ok) {
    return res.status(response.status).json(data);
  }
  res.status(201).json(data);
};

// ── DELETE /api/procedures/:id ──────────────────────────────────────────────
const deleteProcedure = async (req, res) => {
  const response = await fetch(`${RAG_URL}/procedures/${encodeURIComponent(req.params.id)}`, {
    method: "DELETE",
  });
  const data = await response.json();

  if (!response.ok) {
    return res.status(response.status).json(data);
  }
  res.json(data);
};

module.exports = { getProcedures, createProcedure, deleteProcedure };
