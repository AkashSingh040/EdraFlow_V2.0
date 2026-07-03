import { useState, useEffect } from "react";
import api from "../../api/axios";
import {
  Plus, Trash2, Loader2, BookOpen, ArrowLeft, GripVertical,
  ArrowUp, ArrowDown, X, ClipboardList, Tag, Building2, Mail,
  Hash, ListOrdered, Save, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

// ── Procedure Card ──────────────────────────────────────────────────────────
const ProcedureCard = ({ proc, onDelete, deleting }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <ClipboardList size={16} className="text-indigo-600" />
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{proc.title}</h3>
        </div>

        <div className="ml-10 space-y-2">
          {/* Department & Contact */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Building2 size={11} /> {proc.department}
            </span>
            <span className="flex items-center gap-1">
              <Mail size={11} /> {proc.contact}
            </span>
            <span className="flex items-center gap-1 text-gray-400">
              <Hash size={11} /> {proc.id}
            </span>
          </div>

          {/* Steps */}
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-700 text-xs mb-1 flex items-center gap-1">
              <ListOrdered size={12} /> {proc.steps.length} steps
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs text-gray-500">
              {proc.steps.map((s, i) => (
                <li key={i} className="truncate">{s}</li>
              ))}
            </ol>
          </div>

          {/* Tags */}
          {proc.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {proc.tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                >
                  <Tag size={9} /> {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(proc.id)}
        disabled={deleting === proc.id}
        title="Delete procedure"
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
      >
        {deleting === proc.id ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Trash2 size={16} />
        )}
      </button>
    </div>
  </div>
);

// ── Step Input Row ──────────────────────────────────────────────────────────
const StepRow = ({ index, value, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast, total }) => (
  <div className="flex items-center gap-2 group">
    <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">{index + 1}.</span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(index, e.target.value)}
      placeholder={`Step ${index + 1}...`}
      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    />
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={() => onMoveUp(index)}
        disabled={isFirst}
        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
        title="Move up"
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => onMoveDown(index)}
        disabled={isLast}
        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
        title="Move down"
      >
        <ArrowDown size={14} />
      </button>
      {total > 1 && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 text-gray-400 hover:text-red-500"
          title="Remove step"
        >
          <X size={14} />
        </button>
      )}
    </div>
  </div>
);

// ── Main Component ──────────────────────────────────────────────────────────
const ManageProcedures = () => {
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [form, setForm] = useState({
    id: "",
    title: "",
    department: "",
    contact: "",
    tags: "",
    steps: [""],
  });

  // ── Fetch procedures ──────────────────────────────────────────────────────
  const fetchProcedures = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/procedures");
      setProcedures(data.procedures || []);
    } catch {
      toast.error("Failed to load procedures");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcedures();
  }, []);

  // ── Auto-generate ID from title ───────────────────────────────────────────
  const handleTitleChange = (title) => {
    const autoId = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 100);
    setForm((f) => ({ ...f, title, id: autoId }));
  };

  // ── Step management ───────────────────────────────────────────────────────
  const updateStep = (i, val) => {
    setForm((f) => {
      const steps = [...f.steps];
      steps[i] = val;
      return { ...f, steps };
    });
  };

  const addStep = () => {
    setForm((f) => ({ ...f, steps: [...f.steps, ""] }));
  };

  const removeStep = (i) => {
    setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));
  };

  const moveStepUp = (i) => {
    if (i === 0) return;
    setForm((f) => {
      const steps = [...f.steps];
      [steps[i - 1], steps[i]] = [steps[i], steps[i - 1]];
      return { ...f, steps };
    });
  };

  const moveStepDown = (i) => {
    setForm((f) => {
      if (i >= f.steps.length - 1) return f;
      const steps = [...f.steps];
      [steps[i], steps[i + 1]] = [steps[i + 1], steps[i]];
      return { ...f, steps };
    });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanSteps = form.steps.map((s) => s.trim()).filter(Boolean);
    if (cleanSteps.length === 0) {
      toast.error("Add at least one step");
      return;
    }

    if (!form.title.trim() || !form.department.trim() || !form.contact.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const payload = {
      id: form.id.trim(),
      title: form.title.trim(),
      department: form.department.trim(),
      contact: form.contact.trim(),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      steps: cleanSteps,
    };

    setSubmitting(true);
    try {
      await api.post("/procedures", payload);
      toast.success("Procedure added! EdraChat index updated.");
      setForm({ id: "", title: "", department: "", contact: "", tags: "", steps: [""] });
      setShowForm(false);
      await fetchProcedures();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to add procedure";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this procedure? EdraChat will no longer have it.")) return;
    setDeleting(id);
    try {
      await api.delete(`/procedures/${encodeURIComponent(id)}`);
      toast.success("Procedure deleted");
      await fetchProcedures();
    } catch {
      toast.error("Failed to delete procedure");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Procedures</h1>
            <p className="text-gray-500 text-sm">
              Add or remove procedures for the EdraChat knowledge base
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add Procedure"}
        </button>
      </div>

      {/* ── Add Procedure Form ─────────────────────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8 space-y-5"
        >
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Plus size={18} className="text-indigo-500" />
            New Procedure
          </h2>

          {/* Title → auto-generates ID */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Apply for PhD Scholarship"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID <span className="text-gray-400 font-normal">(auto-generated)</span>
              </label>
              <input
                type="text"
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                placeholder="auto-generated-from-title"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Department & Contact */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="e.g. Student Affairs"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                placeholder="e.g. student-affairs@university.edu"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags <span className="text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. scholarship, phd, funding"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Steps <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {form.steps.map((step, i) => (
                <StepRow
                  key={i}
                  index={i}
                  value={step}
                  onChange={updateStep}
                  onRemove={removeStep}
                  onMoveUp={moveStepUp}
                  onMoveDown={moveStepDown}
                  isFirst={i === 0}
                  isLast={i === form.steps.length - 1}
                  total={form.steps.length}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addStep}
              className="mt-2 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Plus size={14} /> Add step
            </button>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Procedure
            </button>
          </div>
        </form>
      )}

      {/* ── Procedures List ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : procedures.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
          <AlertCircle size={40} className="mx-auto mb-4 text-gray-300" />
          <p className="font-medium">No procedures yet</p>
          <p className="text-sm">Click "Add Procedure" to create one.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-indigo-500" />
            <h2 className="font-semibold text-gray-800">
              Knowledge Base
              <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                {procedures.length}
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {procedures.map((proc) => (
              <ProcedureCard
                key={proc.id}
                proc={proc}
                onDelete={handleDelete}
                deleting={deleting}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ManageProcedures;
